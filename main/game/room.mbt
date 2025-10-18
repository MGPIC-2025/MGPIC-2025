///|
struct Room {
  level : Int
  blocks : Array[Array[MapBlock]]
}

///|
let default_enemy_count = [0, 10, 15, 20, 25, 30, 30, 30, 30, 30, 30]

///|
fn summon_enemy(level : Int) -> Enemy {
  if level == 10 {
    // TODO: BOSS 生成的特殊逻辑
    Enemy::new(enemy_map["（BOSS）废械吞噬者 · 饕餮"])
  } else {
    let can_summon_enemy = enemy_list.filter(enemy => enemy.level <= level)
    let enemy = can_summon_enemy[@rand.summon_random_number(
        0,
        can_summon_enemy.length() - 1,
      )]
    Enemy::new(enemy)
  }
}

///|
fn sumoon_postion(escape_set : Set[(Int, Int)]) -> (Int, Int) {
  let mut random_position_x = @rand.summon_random_number(0, 14)
  let mut random_position_y = @rand.summon_random_number(0, 14)
  while escape_set.contains((random_position_x, random_position_y)) {
    random_position_x = @rand.summon_random_number(0, 14)
    random_position_y = @rand.summon_random_number(0, 14)
  }
  (random_position_x, random_position_y)
}

///|
pub fn Room::new(level : Int, escape_point : (Int, Int)) -> Room {
  let blocks = Array::make(15, Array::make(15, MapBlock::new()))
  // 中心点设置为怪物生成器
  blocks[6][6].occupant = ChargingCoil
  let escape_set = @set.from_array([(7, 7), escape_point])
  for i in 0..<default_enemy_count[level] {
    let enemy = summon_enemy(level)
    let position = sumoon_postion(escape_set)
    escape_set.add(position)
    blocks[position.0][position.1].occupant = Occupant::Enemy(enemy)
  }
  // TODO：生成矿物
  { level, blocks }
}
