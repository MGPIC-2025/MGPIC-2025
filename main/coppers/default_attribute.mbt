///|
pub fn get_default_attribute(copper_type : CopperType) -> @attribute.Attribute {
  match copper_type {
    IronWall =>
      @attribute.Attribute::new(
        health=150,
        speed=2,
        attack=15,
        defense=20,
        dodge=10,
      )
    Arcanist =>
      @attribute.Attribute::new(
        health=50,
        speed=2,
        attack=20,
        defense=5,
        dodge=10,
      )
    Resonator =>
      @attribute.Attribute::new(
        health=50,
        speed=1,
        attack=10,
        defense=5,
        dodge=10,
      )
    Mechanic =>
      @attribute.Attribute::new(
        health=80,
        speed=2,
        attack=5,
        defense=5,
        dodge=10,
      )
    CraftsMan =>
      @attribute.Attribute::new(
        health=80,
        speed=1,
        attack=0,
        defense=5,
        dodge=10,
      )
  }
}
