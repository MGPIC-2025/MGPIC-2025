///|
pub struct Enemy {
  id : Int
  mut now_health : Int
  enemy_base : EnemyBase
} derive(ToJson)

///|
struct EnemyBase {
  level : Int
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
} derive(ToJson)

///|
fn Enemy::new(enemy_base : EnemyBase) -> Enemy {
  { id: @id.id_pool.get_id(), now_health: enemy_base.health, enemy_base }
}

///|
fn Enemy::apply_attack(enemy : Enemy, attack : Int) -> Unit {
  let attack = attack - enemy.enemy_base.defense
  if attack > 0 {
    enemy.now_health -= attack
    if enemy.now_health <= 0 {
      
    }
  }
}
