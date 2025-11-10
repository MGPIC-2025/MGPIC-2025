///|
const K : Float = 1.0

///|
fn calculate_damage(attack : Float, defense : Float) -> Float {
  let radio = attack / (attack + K * defense)
  attack * radio
}
