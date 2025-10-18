///|
using @coppers {type Copper}

///|
using @attribute {type Attribute}

///|
struct BattleCopper {
  copper : Copper
  can_move : Bool
  can_attack : Bool
  attribute : Attribute
  inventory : Inventory
} derive(ToJson)
