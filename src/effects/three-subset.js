// Named re-exports so the bundler tree-shakes three. Only ever imported lazily by background3d.js.
export { WebGLRenderer, Scene, PerspectiveCamera, ShaderMaterial, Points, Color, BufferGeometry, BufferAttribute } from 'three';
