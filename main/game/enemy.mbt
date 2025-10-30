///|
let enemy_map : Map[Int, Enemy] = {}

///|
pub struct Enemy {
  id : Int
  mut position : (Int, Int)
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
  enemy_type : String
  description : String
  asset_url : String
  model_url : String
  drop_items : Array[(Item, Double)]
} derive(ToJson)

///|
fn Enemy::new(enemy_base : EnemyBase, position : (Int, Int)) -> Enemy {
  let enemy = {
    id: @id.id_pool.get_id(),
    position,
    now_health: enemy_base.health,
    enemy_base,
  }
  enemy_map.set(enemy.id, enemy)
  enemy
}

///|
fn Enemy::get_drop_items(enemy : Enemy) -> Array[Item] {
  let items = []
  for drop_item in enemy.enemy_base.drop_items {
    let (item, probability) = drop_item
    if @rand.check_probability(probability) {
      items.push(item)
    }
  }
  items
}

///|
fn Enemy::apply_attack(enemy : Enemy, attack : Float) -> Bool {
  let attack = attack - enemy.enemy_base.defense
  if attack > 0 {
    if @rand.check_probability(enemy.enemy_base.dodge.to_double() / 100) {
      return false
    }
    enemy.now_health -= attack
    if enemy.now_health <= 0 {
      return true
    }
  }
  false
}

///|
fn Enemy::get_attack_targets(
  enemy : Enemy,
  map : Map_,
) -> Array[CanAttackTarget] {
  let attack_range = enemy.enemy_base.attack_range
  let offset = generate_offset(attack_range)
  let can_attack = []
  for offset_ in offset {
    let position = (enemy.position.0 + offset_.0, enemy.position.1 + offset_.1)
    if map.is_occupy(position) {
      let occupant = map.get_occupant(position)
      if occupant is Copper(copper) {
        can_attack.push(CanAttackTarget::Copper(copper))
      }
    }
  }
  can_attack
}

///|
/// TODO: 玩家召唤出的 Enemy 和玩家建造的建筑后续也要加入进来
/// 也许需要记得判断一下最近的目标是否能到达？懒得写而且可能影响性能，等真的发现需要再写吧
/// 哦不对是需要写的哦，因为如果一个敌人是不可达的，那么就应该找第二近的目标
/// 不对啊不可达站在原地不动不就行了吗，那还是先不写可达性判断，而且寻路本身不就是可以判断可达性的吗
/// 又想了一下，如果第一个目标无法攻击选择第二个目标是有必要的，如果玩家通过某种方式把自己围起来
/// 那么第一个目标就无法攻击，但是第二个目标可以攻击（比如更远的一道墙），这时候就应该选择第二个目标
/// 但是我觉得这个可以作为玩家减少游戏难度的一个特性
fn Enemy::find_nearest_attack_target(
  enemy : Enemy,
  map : Map_,
) -> CanAttackTarget? {
  let position_list = []
  let (self_x, self_y) = enemy.position
  let copper_list = get_battle_copper_list()
  for x in copper_list {
    position_list.push((x.position, CanAttackTarget::Copper(x)))
  }
  let mut min_distance = 1000000000
  let mut nearest_target = None
  for position in position_list {
    let ((x, y), target) = position
    let distance = (x - self_x).abs() + (y - self_y).abs()
    if distance < min_distance {
      min_distance = distance
      nearest_target = Some(target)
    }
  }
  nearest_target
}
