///|
pub fn Copper::apply_upgrade(copper : Copper) -> Copper {
  if copper.level == 4 {
    {
      ..copper,
      attribute: get_upgrade_attribute(copper),
      level: copper.level + 1,
      equipment_slot: copper.equipment_slot.unlock_slot2(),
    }
  } else {
    {
      ..copper,
      attribute: get_upgrade_attribute(copper),
      level: copper.level + 1,
    }
  }
}

///|
pub fn cost_upgrade(value : Float, level : Int, radio : Float) -> Float {
  (value * @math.pow(radio.to_double(), (level - 1).to_double()).to_float()).round()
}

///|
pub fn get_upgrade_attribute(copper : Copper) -> @attribute.Attribute {
  let level = copper.level + 1
  let attribute = get_default_attribute(copper.copper_type)
  let speed = copper.attribute.speed
  match copper.copper_type {
    IronWall =>
      @attribute.Attribute::new(
        health=cost_upgrade(attribute.health, level, 1.35),
        speed~,
        attack=cost_upgrade(attribute.attack, level, 1.28),
        defense=cost_upgrade(attribute.defense, level, 1.37),
        dodge=cost_upgrade(attribute.dodge, level, 1.19),
      )
    Arcanist =>
      @attribute.Attribute::new(
        health=cost_upgrade(attribute.health, level, 1.22),
        speed~,
        attack=cost_upgrade(attribute.attack, level, 1.40),
        defense=cost_upgrade(attribute.defense, level, 1.27),
        dodge=cost_upgrade(attribute.dodge, level, 1.19),
      )
    Resonator =>
      @attribute.Attribute::new(
        health=cost_upgrade(attribute.health, level, 1.38),
        speed~,
        attack=cost_upgrade(attribute.attack, level, 1.16),
        defense=cost_upgrade(attribute.defense, level, 1.27),
        dodge=cost_upgrade(attribute.dodge, level, 1.19),
      )
    Mechanic =>
      @attribute.Attribute::new(
        health=cost_upgrade(attribute.health, level, 1.3),
        speed~,
        attack=cost_upgrade(attribute.attack, level, 1.2),
        defense=cost_upgrade(attribute.defense, level, 1.27),
        dodge=cost_upgrade(attribute.dodge, level, 1.19),
      )
    CraftsMan =>
      @attribute.Attribute::new(
        health=cost_upgrade(attribute.health, level, 1.3),
        speed~,
        attack=cost_upgrade(attribute.attack, level, 1.27),
        defense=cost_upgrade(attribute.defense, level, 1.16),
        dodge=cost_upgrade(attribute.dodge, level, 1.19),
      )
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
