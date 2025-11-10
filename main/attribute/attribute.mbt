///|
pub struct Attribute {
  health : Float
  speed : Int
  attack : Float
  defense : Float
  dodge : Float
} derive(Eq, ToJson, FromJson)

///|
pub fn Attribute::new(
  health~ : Float,
  speed~ : Int,
  attack~ : Float,
  defense~ : Float,
  dodge~ : Float,
) -> Attribute {
  { health, speed, attack, defense, dodge }
}

///|
pub fn Attribute::merge(
  attribute : Attribute,
  attribute_to_merge : Attribute,
) -> Attribute {
  {
    health: attribute.health + attribute_to_merge.health,
    speed: attribute.speed + attribute_to_merge.speed,
    attack: attribute.attack + attribute_to_merge.attack,
    defense: attribute.defense + attribute_to_merge.defense,
    dodge: attribute.dodge + attribute_to_merge.dodge,
  }
}
