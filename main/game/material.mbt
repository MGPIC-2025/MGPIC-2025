///|
struct Material {
  id : Int
  material_base : MaterialBase
} derive(ToJson)

///|
priv struct MaterialBase {
  name : String
  model_url : String
} derive(ToJson)

///|
fn Material::new(material_base : MaterialBase) -> Material {
  { id: @id.id_pool.get_id(), material_base }
}

///|
let refined_copper_ingot : MaterialBase = {
  name: "精炼铜锭",
  model_url: "assets/refined_copper_ingot/refined_copper_ingot.glb",
}

///|
let resonant_star_crystal : MaterialBase = {
  name: "共鸣星晶",
  model_url: "assets/resonant_star_crystal/resonant_star_crystal.glb",
}
