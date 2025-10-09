///|
struct Attribute {
  health : Float
  attack : Float
  defense : Float
  dodge : Float
}

///|
pub fn Attribute::new(
  health~ : Float,
  attack~ : Float,
  defense~ : Float,
  dodge~ : Float,
) -> Attribute {
  { health, attack, defense, dodge }
}

///|
pub fn Attribute::merge(
  attribute : Attribute,
  attribute_to_merge : Attribute,
) -> Attribute {
  {
    health: attribute.health + attribute_to_merge.health,
    attack: attribute.attack + attribute_to_merge.attack,
    defense: attribute.defense + attribute_to_merge.defense,
    dodge: attribute.dodge + attribute_to_merge.dodge,
  }
}
