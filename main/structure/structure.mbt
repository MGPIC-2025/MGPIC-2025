///|
struct Structure {
  id : Int
  structure_base : StructureBase
} derive(ToJson)

///|
struct StructureBase {
  name : String
  health : Int
  description : String
  asset_url : String
  model_url : String
  cost : @resource.ResourceCost
} derive(ToJson)

///|
pub fn Structure::new(structure_base : StructureBase) -> Structure {
  { id: @id.id_pool.get_id(), structure_base }
}

///|
pub fn Structure::id(structure : Structure) -> Int {
  structure.id
}
