///|
pub struct Enemy {
  id : Int
  mut now_health : Float
  enemy_base : EnemyBase
} derive(ToJson)

///|
struct EnemyBase {
  level : Int
  health : Float
  attack : Float
  defense : Float
  dodge : Float
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
fn Enemy::apply_attack(enemy : Enemy, attack : Float) -> Bool {
  let attack = attack - enemy.enemy_base.defense
  if attack > 0 {
    // 如果敌人有闪避，则不受到伤害
    if @rand.check_probability(enemy.enemy_base.dodge.to_double() / 100) {
      return false
    }
    // 计算伤害
    enemy.now_health -= attack
    // 如果敌人血量小于等于 0，则删除单位
    if enemy.now_health <= 0 {
      return true
    }
  }
  false
}
