import type { AidInputs, AidResult } from '../types';
import { SPHERE_PLANNING } from '../data/verifiedSources';

const finiteNonnegative = (n: number) => Number.isFinite(n) && n >= 0;
const wholeNonnegative = (n: number) => finiteNonnegative(n) && Number.isInteger(n);

/**
 * Transparent scenario planning model, not a validated needs assessment.
 * Satellite light/fire/change indicators are contextual and are deliberately
 * NOT multiplied into humanitarian quantities.
 */
export function calculateAidRequirements(input: AidInputs): AidResult {
  const {
    people, days, households, shelterHouseholds,
    waterLitersPerPersonDay, shelterKitHouseholds, hygieneKitHouseholds
  } = input;

  if (![people, days, households, shelterHouseholds, shelterKitHouseholds, hygieneKitHouseholds].every(wholeNonnegative) ||
      days <= 0 || shelterKitHouseholds <= 0 || hygieneKitHouseholds <= 0 ||
      !finiteNonnegative(waterLitersPerPersonDay) || waterLitersPerPersonDay <= 0) {
    throw new Error('People, households, days and kit coverage must be valid whole numbers; water rate must be positive.');
  }
  if (shelterHouseholds > households) {
    throw new Error('Shelter households cannot exceed affected households.');
  }

  for (const [label, amount] of [
    ['Water stock', input.availableWaterLiters],
    ['Food assistance stock', input.availableFoodPersonDays],
    ['Shelter kits stock', input.availableShelterKits],
    ['Hygiene kits stock', input.availableHygieneKits]
  ] as const) {
    if (amount !== undefined && !finiteNonnegative(amount)) {
      throw new Error(`${label} must be a finite, non-negative quantity.`);
    }
  }
  for (const [label, amount] of [
    ['Shelter kits stock', input.availableShelterKits],
    ['Hygiene kits stock', input.availableHygieneKits]
  ] as const) {
    if (amount !== undefined && !Number.isInteger(amount)) {
      throw new Error(`${label} must be a whole number.`);
    }
  }

  const waterLiters = people * waterLitersPerPersonDay * days;
  const foodPersonDays = people * days;
  const shelterKits = Math.ceil(shelterHouseholds / shelterKitHouseholds);
  const hygieneKits = Math.ceil(households / hygieneKitHouseholds);
  return {
    waterLiters,
    waterCubicMeters: waterLiters / 1000,
    foodPersonDays,
    foodEnergyKcalTarget: foodPersonDays * SPHERE_PLANNING.generalFoodEnergyKcalPerPersonPerDay,
    shelterKits,
    hygieneKits,
    healthAssessmentPeople: people,
    ...(input.availableWaterLiters === undefined ? {} : { unmetWaterLiters: Math.max(0, waterLiters - input.availableWaterLiters) }),
    ...(input.availableFoodPersonDays === undefined ? {} : { unmetFoodPersonDays: Math.max(0, foodPersonDays - input.availableFoodPersonDays) }),
    ...(input.availableShelterKits === undefined ? {} : { unmetShelterKits: Math.max(0, shelterKits - input.availableShelterKits) }),
    ...(input.availableHygieneKits === undefined ? {} : { unmetHygieneKits: Math.max(0, hygieneKits - input.availableHygieneKits) })
  };
}
