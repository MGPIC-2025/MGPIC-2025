///|
pub fn get_default_attribute(copper_type : CopperType) -> @attribute.Attribute {
  match copper_type {
    IronWall =>
      @attribute.Attribute::new(health=100, attack=10, defense=10, dodge=10)
    Arcanist =>
      @attribute.Attribute::new(health=30, attack=20, defense=5, dodge=5)
    Resonator =>
      @attribute.Attribute::new(health=30, attack=5, defense=5, dodge=5)
    Mechanic =>
      @attribute.Attribute::new(health=50, attack=5, defense=5, dodge=5)
    CraftsMan =>
      @attribute.Attribute::new(health=50, attack=0, defense=5, dodge=5)
  }
}
