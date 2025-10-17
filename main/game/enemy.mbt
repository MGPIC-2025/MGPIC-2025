///|
pub struct Enemy {
  id : Int
  enemy_base : EnemyBase
}

///|
struct EnemyBase {
  health : Int
  attack : Int
  defense : Int
  dodge : Int
  attack_range : Int
  move_range : Int
  name : String
  description : String
  asset_url : String
  model_url : String
  drop_items : Array[(Item, Double)]
}

///|
fn Enemy::new(enemy_base : EnemyBase) -> Enemy {
  { id: @id.id_pool.get_id(), enemy_base }
}
