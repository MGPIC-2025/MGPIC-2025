///|
struct EquipmentSlot {
  slot1 : @equipment.Equipment?
  slot2 : @equipment.Equipment?
  is_slot2_locked : Bool
} derive(ToJson)

///|
pub fn EquipmentSlot::new() -> EquipmentSlot {
  { slot1: None, slot2: None, is_slot2_locked: true }
}

///|
pub fn EquipmentSlot::unlock_slot2(
  equipment_slot : EquipmentSlot,
) -> EquipmentSlot {
  { ..equipment_slot, is_slot2_locked: false }
}

///|
pub fn EquipmentSlot::equip(
  equipment_slot : EquipmentSlot,
  equipment : @equipment.Equipment,
) -> (EquipmentSlot, Bool) {
  if equipment_slot.slot1 is None {
    ({ ..equipment_slot, slot1: Some(equipment) }, true)
  } else if equipment_slot.slot2 is None {
    ({ ..equipment_slot, slot2: Some(equipment) }, true)
  } else {
    @global_msg.msg_info.broadcast({
      type_msg: "equipment_slot_full",
      content: "装备槽已满",
    })
    (equipment_slot, false)
  }
}
