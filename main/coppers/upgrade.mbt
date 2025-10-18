///|
pub fn Copper::apply_upgrade(copper : Copper) -> Copper {
  let attribute = get_upgrade_effect(copper)
  if copper.level == 4 {
    {
      ..copper,
      attribute: copper.attribute.merge(attribute),
      level: copper.level + 1,
      equipment_slot: copper.equipment_slot.unlock_slot2(),
    }
  } else {
    {
      ..copper,
      attribute: copper.attribute.merge(attribute),
      level: copper.level + 1,
    }
  }
}

///|
pub fn get_upgrade_effect(copper : Copper) -> @attribute.Attribute {
  match copper.copper_type {
    IronWall =>
      @attribute.Attribute::new(health=30, attack=5, defense=5, dodge=5)
    Arcanist =>
      @attribute.Attribute::new(health=15, attack=10, defense=2.5, dodge=2.5)
    Resonator =>
      @attribute.Attribute::new(health=15, attack=2.5, defense=2.5, dodge=2.5)
    Mechanic | CraftsMan =>
      @attribute.Attribute::new(health=15, attack=2.5, defense=2.5, dodge=2.5)
  }
}

///|
pub fn get_upgrade_cost(level : Int) -> @resource.ResourceCost {
  let cost = match level {
    1 => 5
    2 => 10
    3 => 20
    4 => 30
    _ => {
      @global_msg.msg_info.broadcast({
        type_msg: "upgrade_cost_error",
        content: "升级等级错误",
      })
      0
    }
  }
  @resource.ResourceCost::new([(@resource.SpiritalSpark, cost)])
}
