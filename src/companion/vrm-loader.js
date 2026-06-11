// vrm-loader.js — Three.js + VRM loader with 2D fallback

let _three = null;
let _vrmLib = null;
let _loaded = false;

/**
 * Attempt to load Three.js + @pixiv/three-vrm from CDN.
 * Returns { three, vrmLib } or null on failure.
 */
export async function loadLibraries() {
  if (_loaded) return { three: _three, vrmLib: _vrmLib };

  try {
    // Dynamic import from CDN — graceful failure if offline
    _three  = await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'THREE');
    await _loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', 'THREE');
    _vrmLib = await _loadScript('https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@1/lib/three-vrm.js', 'THREE_VRM');
    _loaded = true;
    return { three: _three, vrmLib: _vrmLib };
  } catch (e) {
    console.warn('[vrm-loader] CDN load failed, using 2D fallback:', e.message);
    return null;
  }
}

async function _loadScript(url, globalKey) {
  return new Promise((resolve, reject) => {
    if (window[globalKey]) { resolve(window[globalKey]); return; }
    const s = document.createElement('script');
    s.src = url;
    s.onload  = () => resolve(window[globalKey]);
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(s);
  });
}

/**
 * Load a VRM model file into a Three.js scene.
 * @param {string} modelPath - path to .vrm file
 * @param {HTMLCanvasElement} canvas - target canvas
 * @returns {{ vrm, renderer, scene, camera, mixer }} or null
 */
export async function loadVRM(modelPath, canvas) {
  const libs = await loadLibraries();
  if (!libs) return null;

  const THREE = libs.three;
  // GLTFLoader is attached to THREE by the CDN addon script
  const GLTFLoader = THREE.GLTFLoader;
  if (!GLTFLoader) return null;

  const VRMLoaderPlugin = libs.vrmLib?.VRMLoaderPlugin;
  if (!VRMLoaderPlugin) return null;

  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, canvas.width / canvas.height, 0.1, 20);
    camera.position.set(0, 1.2, 3);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dir     = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 1, 1);
    scene.add(ambient, dir);

    const loader = new GLTFLoader();
    loader.register(parser => new VRMLoaderPlugin(parser));

    const gltf = await new Promise((res, rej) => loader.load(modelPath, res, undefined, rej));
    const vrm  = gltf.userData.vrm;
    if (!vrm) throw new Error('VRM data not found in GLTF');

    scene.add(gltf.scene);

    // Position camera to frame waist-up
    const head = vrm.humanoid?.getNormalizedBoneNode?.('head');
    if (head) {
      const headY = head.getWorldPosition(new THREE.Vector3()).y;
      camera.position.set(0, headY * 0.7, 2.5);
      camera.lookAt(0, headY * 0.7, 0);
    }

    const mixer = new THREE.AnimationMixer(gltf.scene);
    return { vrm, renderer, scene, camera, mixer };
  } catch (e) {
    console.warn('[vrm-loader] VRM load failed:', e.message);
    return null;
  }
}

async function _importGLTF(THREE) {
  try {
    // Try importing GLTFLoader from CDN
    await _loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', '_gltfLoader');
    const GLTFLoader = THREE.GLTFLoader || window._gltfLoader;
    return { GLTFLoader };
  } catch {
    return { GLTFLoader: null };
  }
}
