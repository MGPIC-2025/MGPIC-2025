///|
pub(all) enum ResourceType {
  HeartCrystalDust
  RecallGear
  SpiritalSpark
  RefinedCopper
  ResonantCrystal
} derive(Show, Eq, Hash)

///|
pub struct ResourceCost {
  cost : Array[(ResourceType, Int)]
}

///|
pub fn ResourceCost::new(cost : Array[(ResourceType, Int)]) -> ResourceCost {
  { cost, }
}
