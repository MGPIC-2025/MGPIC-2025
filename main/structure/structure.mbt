///|
pub struct Structure {
  id : Int
  owned : Bool // 是否是玩家建造的结构
  structure_base : StructureBase
} derive(ToJson)

///|
struct StructureBase {
  name : String
  health : Int
  // 是否可以攻击，只有玩家建造出的可攻击结构可以攻击
  can_attack : Bool
  description : String
  asset_url : String
  model_url : String
  cost : @resource.ResourceCost
} derive(ToJson)

///|
pub fn Structure::new(
  structure_base : StructureBase,
  owned : Bool,
) -> Structure {
  { id: @id.id_pool.get_id(), owned, structure_base }
}
