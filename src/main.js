const FrenchPicnic$threejs$$Camera$new = (fov, aspect, near, far) => new THREE.PerspectiveCamera( fov, aspect, near, far );;
const FrenchPicnic$threejs$$DirectionalLight$new = (color,intensity) => new THREE.DirectionalLight(color, intensity);
const FrenchPicnic$threejs$$Render$newWebGL = function(canavas) {
const canvas = document.querySelector( canavas );
const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );
return renderer;
};
const FrenchPicnic$threejs$$Render$render = (renderer,scene,camera) => renderer.render( scene, camera );;
const FrenchPicnic$threejs$$Render$setPixelRatio = (renderer,value) => renderer.setPixelRatio( value );;
const FrenchPicnic$threejs$$Render$setSize = (renderer,width,height,updateStyle) => renderer.setSize( width, height, updateStyle);;
const FrenchPicnic$threejs$$Scene$new = () => new THREE.Scene();;
const FrenchPicnic$threejs$$add_ffi = (parent, child) => parent.add( child );;
const FrenchPicnic$threejs$$set_position_ffi = (obj,x,y,z) => obj.position.set(x,y,z);;
const FrenchPicnic$threejs$$DRACOLoader$new = () => new DRACOLoader();;
const FrenchPicnic$threejs$$DRACOLoader$setDecoderPath = (self,path) => self.setDecoderPath(path);;
const FrenchPicnic$threejs$$GLTF$scene = (self) => self.scene;
const FrenchPicnic$threejs$$GLTFLoader$load = function(loader,path,onload){
loader.load(path, onload);
};
const FrenchPicnic$threejs$$GLTFLoader$new = () => new GLTFLoader();;
const FrenchPicnic$threejs$$GLTFLoader$setDRACOLoader = (self,dracoLoader) => self.setDRACOLoader(dracoLoader);;
const FrenchPicnic$threejs$$Scene$background = (self,color) => self.background = new THREE.Color(color);;
const FrenchPicnic$threejs$$lookat_ffi = (obj,x,y,z) => obj.lookAt(x,y,z);;
function moonbitlang$core$builtin$$println$0$(input) {
  console.log(input);
}
function FrenchPicnic$threejs$$IsObject$add$1$(self, child) {
  FrenchPicnic$threejs$$add_ffi(self, child);
}
function FrenchPicnic$threejs$$IsObject$set_position$2$(self, x, y, z) {
  FrenchPicnic$threejs$$set_position_ffi(self, x, y, z);
}
function FrenchPicnic$threejs$$IsObject$set_position$3$(self, x, y, z) {
  FrenchPicnic$threejs$$set_position_ffi(self, x, y, z);
}
function FrenchPicnic$threejs$$IsObject$lookat$3$(self, x, y, z) {
  FrenchPicnic$threejs$$lookat_ffi(self, x, y, z);
}
function Lampese$MGPIC_2025$main$$logo() {
  const a = FrenchPicnic$threejs$$GLTFLoader$new();
  const light = FrenchPicnic$threejs$$DirectionalLight$new("white", Math.fround(12.5));
  FrenchPicnic$threejs$$IsObject$set_position$2$(light, Math.fround(-5), Math.fround(0), Math.fround(1));
  const scene = FrenchPicnic$threejs$$Scene$new();
  FrenchPicnic$threejs$$Scene$background(scene, "#a0a0a0");
  FrenchPicnic$threejs$$IsObject$add$1$(scene, light);
  const camera = FrenchPicnic$threejs$$Camera$new(Math.fround(40), Math.fround(1), Math.fround(1.1), Math.fround(70));
  FrenchPicnic$threejs$$IsObject$set_position$3$(camera, Math.fround(-7), Math.fround(0), Math.fround(2));
  FrenchPicnic$threejs$$IsObject$lookat$3$(camera, Math.fround(10), Math.fround(0), Math.fround(0));
  const rederer = FrenchPicnic$threejs$$Render$newWebGL("#c");
  FrenchPicnic$threejs$$Render$render(rederer, scene, camera);
  FrenchPicnic$threejs$$Render$setPixelRatio(rederer, window.devicePixelRatio);
  FrenchPicnic$threejs$$Render$setSize(rederer, window.innerWidth, window.innerHeight, false);
  const onload = (gltf) => {
    const _p = FrenchPicnic$threejs$$GLTF$scene(gltf);
    FrenchPicnic$threejs$$IsObject$add$1$(scene, _p);
    FrenchPicnic$threejs$$Render$render(rederer, scene, camera);
  };
  const darco = FrenchPicnic$threejs$$DRACOLoader$new();
  FrenchPicnic$threejs$$DRACOLoader$setDecoderPath(darco, "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  FrenchPicnic$threejs$$GLTFLoader$setDRACOLoader(a, darco);
  FrenchPicnic$threejs$$GLTFLoader$load(a, "/assets/logo.glb", onload);
}
function Lampese$MGPIC_2025$main$$foo() {
  moonbitlang$core$builtin$$println$0$("Hello, World!");
}
(() => {
  Lampese$MGPIC_2025$main$$logo();
})();
export { Lampese$MGPIC_2025$main$$logo as logo, Lampese$MGPIC_2025$main$$foo as foo }
