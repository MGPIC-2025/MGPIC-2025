///|
priv enum CanAttackTarget {
  Enemy(Enemy)
  Copper(BattleCopper)
}

///|
fn CanAttackTarget::get_position_from_can_attack_target(
  can_attack_target : CanAttackTarget,
) -> (Int, Int) {
  match can_attack_target {
    Enemy(enemy) => enemy.position
    Copper(copper) => copper.position
  }
}
