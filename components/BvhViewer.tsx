import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader';
import { ViewerState } from '../types';

// --- Stickman Visualizer Class ---
class StickmanVisualizer {
  group: THREE.Group;
  items: Array<{
    type: 'joint' | 'bone';
    mesh: THREE.Mesh;
    bone?: THREE.Bone;
    parent?: THREE.Bone;
    child?: THREE.Bone;
  }>;

  constructor(skeleton: THREE.Skeleton, thickness: number, color: THREE.ColorRepresentation) {
    this.group = new THREE.Group();
    this.items = [];

    const jointGeo = new THREE.SphereGeometry(1, 16, 16);
    const boneGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
    boneGeo.translate(0, 0.5, 0);

    const material = new THREE.MeshStandardMaterial({ 
      color: color, 
      roughness: 0.3, 
      metalness: 0.3 
    });

    const traverse = (bone: THREE.Bone) => {
      // Joint
      const j = new THREE.Mesh(jointGeo, material);
      // Ensure joints don't cast shadows on themselves weirdly, but cast on ground
      j.castShadow = true;
      j.receiveShadow = true;
      this.group.add(j);
      this.items.push({ type: 'joint', mesh: j, bone: bone });

      // Connection to children
      for (const child of bone.children) {
        if (child.type === 'Bone') {
          const b = new THREE.Mesh(boneGeo, material);
          b.castShadow = true;
          b.receiveShadow = true;
          this.group.add(b);
          this.items.push({ type: 'bone', mesh: b, parent: bone, child: child as THREE.Bone });
          traverse(child as THREE.Bone);
        }
      }
    };

    let root = skeleton.bones[0];
    // If root is just a wrapper, maybe start deeper? 
    // The reference logic: if(root.children.length === 1 && root.children[0].isBone) root = root.children[0];
    if (root.children.length === 1 && root.children[0].type === 'Bone') {
      root = root.children[0] as THREE.Bone;
    }
    
    traverse(root);
    this.update(thickness, color);
  }

  update(thickness: number, color: THREE.ColorRepresentation) {
    const pos1 = new THREE.Vector3();
    const pos2 = new THREE.Vector3();
    const diff = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    // Update material color
    if (this.items.length > 0) {
      const mat = this.items[0].mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(color);
    }

    this.items.forEach(item => {
      if (item.type === 'joint' && item.bone) {
        item.bone.getWorldPosition(pos1);
        item.mesh.position.copy(pos1);
        item.mesh.scale.setScalar(thickness * 0.8);
      } else if (item.type === 'bone' && item.parent && item.child) {
        item.parent.getWorldPosition(pos1);
        item.child.getWorldPosition(pos2);
        diff.subVectors(pos2, pos1);
        const len = diff.length();
        item.mesh.position.copy(pos1);
        if (len > 0.0001) item.mesh.quaternion.setFromUnitVectors(up, diff.normalize());
        item.mesh.scale.set(thickness, len, thickness);
      }
    });
  }
}

interface BvhViewerProps {
  bvhContent: string | null;
  viewerState: ViewerState;
  onStateUpdate: (updates: Partial<ViewerState>) => void;
}

const BvhViewer: React.FC<BvhViewerProps> = ({ bvhContent, viewerState, onStateUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Three.js instances refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Custom Visualizer & Groups
  const visualizerRef = useRef<StickmanVisualizer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null); // The scaled group containing the actual skeleton
  const visualizerThicknessRef = useRef<number>(1);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate 900
    
    // Adjusted Fog: Increased range to reduce atmospheric attenuation
    // Previous: 200, 4000
    scene.fog = new THREE.Fog(0x0f172a, 400, 8000); 
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 1, 20000);
    camera.position.set(0, 400, 800);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10;
    controls.maxDistance = 5000;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Grid
    const gridHelper = new THREE.GridHelper(3000, 100, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 500, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(100, 500, 200);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 2000;
    const d = 500;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Model Group (Invisible, used for driving animation and scaling)
    const modelGroup = new THREE.Group();
    modelGroupRef.current = modelGroup;
    scene.add(modelGroup);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        containerRef.current?.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Load BVH Data
  useEffect(() => {
    if (!bvhContent || !sceneRef.current || !modelGroupRef.current) return;

    // 1. Cleanup Previous
    if (visualizerRef.current) {
      sceneRef.current.remove(visualizerRef.current.group);
      visualizerRef.current = null;
    }
    
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }

    const modelGroup = modelGroupRef.current;
    modelGroup.clear(); // Remove old skeletons
    
    // Reset transform before loading new
    modelGroup.scale.set(1, 1, 1);
    modelGroup.position.set(0, 0, 0);
    modelGroup.updateMatrixWorld(true);

    try {
      const loader = new BVHLoader();
      const result = loader.parse(bvhContent);
      const skeleton = result.skeleton;
      const rootBone = skeleton.bones[0];

      // 2. Setup Animation Mixer with SkinnedMesh Trick
      // This is crucial to avoid "Can not bind to bones" errors if the root is not a SkinnedMesh
      // Fix for "Cannot read properties of undefined (reading 'getX')" crash in Three.js r160+:
      // SkinnedMesh geometry MUST have skinIndex and skinWeight attributes, even if not rendered.
      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const positionAttr = geometry.attributes.position;
      const vertexCount = positionAttr.count;
      
      const skinIndices = new Float32Array(vertexCount * 4);
      const skinWeights = new Float32Array(vertexCount * 4);
      
      // Bind everything to bone 0 with weight 1
      for (let i = 0; i < vertexCount; i++) {
        skinIndices[i * 4] = 0;
        skinWeights[i * 4] = 1;
        skinWeights[i * 4 + 1] = 0;
        skinWeights[i * 4 + 2] = 0;
        skinWeights[i * 4 + 3] = 0;
      }
      
      geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
      geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));

      const dummyMesh = new THREE.SkinnedMesh(
        geometry, 
        new THREE.MeshBasicMaterial({ visible: false })
      );
      dummyMesh.frustumCulled = false; // Disable frustum culling to prevent bounding sphere calc issues
      dummyMesh.bind(skeleton);
      dummyMesh.add(rootBone);
      modelGroup.add(dummyMesh);

      const mixer = new THREE.AnimationMixer(dummyMesh);
      const action = mixer.clipAction(result.clip);
      action.play();
      mixer.update(0); // Tick to set initial pose

      // 3. Calculate Bounds & Normalize Scale
      modelGroup.updateMatrixWorld(true);
      
      const box = new THREE.Box3();
      const tempVec = new THREE.Vector3();
      let totalLen = 0;
      let count = 0;

      // Compute bounding box and average bone length manually
      skeleton.bones.forEach(bone => {
        bone.getWorldPosition(tempVec);
        box.expandByPoint(tempVec);
        if (bone.parent && bone.parent.type === 'Bone') {
           const parentPos = new THREE.Vector3();
           bone.parent.getWorldPosition(parentPos);
           totalLen += tempVec.distanceTo(parentPos);
           count++;
        }
      });

      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 1000; // Normalize everything to 1000 units roughly
      const scaleFactor = maxDim > 0 ? (targetSize / maxDim) : 1.0;

      // Apply Scale & Center to the Model Group
      modelGroup.scale.setScalar(scaleFactor);
      // Center on X/Z, put feet on ground (Y=0)
      modelGroup.position.copy(center).multiplyScalar(-scaleFactor);
      modelGroup.position.y = -box.min.y * scaleFactor;
      
      modelGroup.updateMatrixWorld(true);

      // 4. Create Visualizer
      const avgBoneLen = count > 0 ? totalLen / count : (size.y / 20);
      // Heuristic for thickness based on model size
      const thickness = Math.max(0.5, avgBoneLen * scaleFactor * 0.15);
      visualizerThicknessRef.current = thickness;

      const visualizer = new StickmanVisualizer(skeleton, thickness, viewerState.skeletonColor);
      sceneRef.current.add(visualizer.group);
      visualizerRef.current = visualizer;

      // 5. Adjust Camera
      if (controlsRef.current && cameraRef.current) {
         const centerY = targetSize * 0.5;
         const fov = cameraRef.current.fov * (Math.PI / 180);
         
         // Adjusted Camera Distance: 0.6 multiplier (was 1.2) to zoom in 2x
         const dist = Math.abs(targetSize / Math.tan(fov / 2)) * 0.6;
         
         cameraRef.current.position.set(0, centerY + (targetSize * 0.2), dist);
         cameraRef.current.lookAt(0, centerY, 0);
         controlsRef.current.target.set(0, centerY, 0);
         controlsRef.current.update();
      }

      mixerRef.current = mixer;
      actionRef.current = action;

      onStateUpdate({ 
        duration: result.clip.duration,
        currentTime: 0,
        isPlaying: true 
      });

    } catch (error) {
      console.error("Error parsing BVH:", error);
      alert("Failed to parse BVH file.");
    }

  }, [bvhContent]);

  // Update Loop
  const animate = useCallback(() => {
    requestRef.current = requestAnimationFrame(animate);

    const delta = clockRef.current.getDelta();
    
    if (mixerRef.current) {
      mixerRef.current.timeScale = viewerState.isPlaying ? viewerState.timeScale : 0;
      mixerRef.current.update(delta);

      // CRITICAL: Force matrix update before visualizer reads positions
      if (modelGroupRef.current) {
        modelGroupRef.current.updateMatrixWorld(true);
      }

      // Update Visualizer
      if (visualizerRef.current) {
        visualizerRef.current.update(visualizerThicknessRef.current, viewerState.skeletonColor);
      }

      if (actionRef.current && viewerState.isPlaying) {
         onStateUpdate({ currentTime: actionRef.current.time });
      }
    }

    if (controlsRef.current) controlsRef.current.update();
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [viewerState.isPlaying, viewerState.timeScale, viewerState.skeletonColor]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Handle Manual Seek
  useEffect(() => {
    if (mixerRef.current && actionRef.current) {
        const diff = Math.abs(actionRef.current.time - viewerState.currentTime);
        if (diff > 0.1) {
           actionRef.current.time = viewerState.currentTime;
           if (!viewerState.isPlaying) {
             mixerRef.current.update(0); 
             // Manually update visuals when paused and seeking
             if (modelGroupRef.current) modelGroupRef.current.updateMatrixWorld(true);
             if (visualizerRef.current) visualizerRef.current.update(visualizerThicknessRef.current, viewerState.skeletonColor);
           }
        }
    }
  }, [viewerState.currentTime]);

  return <div ref={containerRef} className="w-full h-full relative" />;
};

export default BvhViewer;