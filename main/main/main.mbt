///|
pub fn start_menu() -> Unit {
  logo()
}

///|
fn logo() -> Unit {
  let a = @three.GLTFLoader::new()
  let light = @three.DirectionalLight::new("white", 12.5)
  light.set_position(-5, 0, 1)
  let scene = @three.Scene::new()
  scene.background("#a0a0a0")
  scene.add(light |> @three.js_identity)
  let camera = @three.Camera::new(40, 1, 1.1, 70)
  camera.set_position(-7, 0, 2)
  camera.lookat(10, 0, 0)
  let rederer = @three.Render::newWebGL("#c")
  rederer.render(scene |> @three.js_identity, camera)
  rederer.setPixelRatio(@tmath.devicePixelRatio())
  rederer.setSize(@tmath.innerWidth(), @tmath.innerHeight(), false)
  let onload : (@three.GLTF) -> Unit = fn(gltf : @three.GLTF) {
    scene.add(gltf.scene() |> @three.js_identity)
    rederer.render(scene |> @three.js_identity, camera)
  }
  let darco = @three.DRACOLoader::new()
  darco.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  )
  a.setDRACOLoader(darco)
  @three.GLTFLoader::load(a, "/assets/logo.glb", onload)
}
