///|
pub fn start_menu() -> Unit {
  logo()
}

///|
fn logo() -> Unit {
  let loader = @three.GLTFLoader::new()
  let light = @three.DirectionalLight::new("white", 12.5)
  light.set_position(-5, -2, 1)
  let scene = @three.Scene::new()
  scene.background("#a0a0a0")
  scene.add(light |> @three.js_identity)
  let camera = @three.Camera::new(55, 2, 1.1, 70)
  camera.set_position(-3.6, 0.5, 0.4)
  camera.lookat(10, 0, 0)
  camera.set_rotation(
    -1.0225770885688956, -1.548136710346424, -1.022462880761241, "XYZ",
  )
  let control = @three.OrbitControl::new(camera, "#c")
  control.update() |> ignore
  let rederer = @three.Render::newWebGL("#c")
  rederer.render(scene |> @three.js_identity, camera)
  rederer.setPixelRatio(@tmath.devicePixelRatio())
  rederer.setSize(@tmath.innerWidth(), @tmath.innerHeight(), false)
  let onload : (@three.GLTF) -> Unit = fn(gltf : @three.GLTF) {
    let model = gltf
    model.scene().set_position(-1, -0.5, -1)
    scene.add(gltf.scene() |> @three.js_identity)
    rederer.render(scene |> @three.js_identity, camera)
  }
  let darco = @three.DRACOLoader::new()
  darco.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  )
  loader.setDRACOLoader(darco)
  @three.GLTFLoader::load(loader, "/assets/logo.glb", onload)
  fn update(time : Double) {
    rederer.render(scene |> @three.js_identity, camera)
    ignore(@three.request_animation_frame(update))
  }

  ignore(@three.request_animation_frame(update))
}
