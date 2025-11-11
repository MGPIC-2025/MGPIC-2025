///|
let enemy_map : Map[Int, Enemy] = {}

///|
priv struct Enemy {
  id : Int
  owned : Bool // true=友方召唤物，false=野生敌人
  // 是否可以移动/攻击（仅用于 owned 为 true 的敌人）
  mut can_move : Bool
  mut can_attack : Bool
  mut position : (Int, Int)
  mut now_health : Float
  enemy_base : EnemyBase
} derive(ToJson)

///|
priv struct EnemyBase {
  level : Int
  health : Float
  attack : Float
  defense : Float
  dodge : Float
  attack_range : Int
  speed : Int
  name : String
  enemy_type : String
  description : String
  asset_url : String
  model_url : String
  drop_items : Array[(ResourceType, (Int, Int))]
  summon_cost : ResourceCost
} derive(ToJson)

///|
fn Enemy::new(
  enemy_base : EnemyBase,
  position : (Int, Int),
  owned : Bool,
) -> Enemy {
  // 友方召唤物第一回合不能移动和攻击，野生敌人可以
  let can_move = if owned { false } else { true }
  let can_attack = if owned { false } else { true }
  let enemy = {
    id: @id.id_pool.get_id(),
    position,
    owned,
    can_move,
    can_attack,
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
    let count = summon_random_number(drop_item.1.0, drop_item.1.1)
    items.push(Item::new(Resource(drop_item.0), count~))
  }
  items
}

///|
fn Enemy::apply_attack(enemy : Enemy, attack : Float) -> Bool {
  if check_probability(enemy.enemy_base.dodge.to_double() / 100) {
    return false
  }
  let damage = calculate_damage(attack, enemy.enemy_base.defense)
  enemy.now_health -= damage
  enemy.now_health <= 0
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
      if enemy.owned {
        match occupant {
          Enemy(enemy) if enemy.owned == false =>
            can_attack.push(CanAttackTarget::Enemy(enemy))
          Structure(structure) if structure.owned == false =>
            can_attack.push(CanAttackTarget::Structure(structure))
          _ => ()
        }
      } else {
        match occupant {
          Copper(copper) => can_attack.push(CanAttackTarget::Copper(copper))
          Enemy(enemy) if enemy.owned == true =>
            can_attack.push(CanAttackTarget::Enemy(enemy))
          Structure(structure) if structure.owned == true =>
            can_attack.push(CanAttackTarget::Structure(structure))
          _ => ()
        }
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
fn Enemy::find_nearest_attack_target(enemy : Enemy) -> CanAttackTarget? {
  let position_list = []
  let (self_x, self_y) = enemy.position
  let copper_list = get_battle_copper_list()
  for copper in copper_list {
    position_list.push((copper.position, CanAttackTarget::Copper(copper)))
  }
  for other_enemy in enemy_map.values() {
    if other_enemy.id != enemy.id && other_enemy.owned {
      position_list.push(
        (other_enemy.position, CanAttackTarget::Enemy(other_enemy)),
      )
    }
  }
  for structure in structure_map.values() {
    if structure.owned == true {
      position_list.push(
        (structure.position, CanAttackTarget::Structure(structure)),
      )
    }
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

///|
fn Enemy::get_can_move(enemy : Enemy, map : Map_) -> Array[(Int, Int)] {
  let offset = generate_offset(enemy.enemy_base.speed)
  let can_move = []
  for offset_ in offset {
    let position = (enemy.position.0 + offset_.0, enemy.position.1 + offset_.1)
    if !map.is_occupy_or_out_of_map(position) {
      can_move.push(position)
    }
  }
  can_move
}

///|
fn Enemy::update_move_and_attack_and_summon_status(enemy : Enemy) -> Unit {
  clear_state(enemy.id)
  if enemy.can_move {
    display_can_move(enemy.id, true)
  }
  if enemy.can_attack {
    display_can_attack(enemy.id, true)
  }
}
