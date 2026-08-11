import type { ActivityDefinition, ItemDefinition, JobDefinition, LocationDefinition, ObjectiveDefinition } from './types';

export const LOCATIONS: LocationDefinition[] = [
  { id: 'home', name: 'Rosehip Court', strapline: 'Your small but dependable rented room.', kind: 'home' },
  { id: 'cafe', name: 'The Wonky Teapot', strapline: 'Tea, toasties and the occasional queue.', kind: 'work', hours: { open: 7 * 60, close: 18 * 60 } },
  { id: 'shop', name: 'Village Basket', strapline: 'Useful bits, friendly prices, mysterious offers.', kind: 'shop', hours: { open: 7 * 60, close: 21 * 60 } },
  { id: 'gym', name: 'Towpath Fitness', strapline: 'Move heavy things on purpose.', kind: 'training', hours: { open: 6 * 60, close: 22 * 60 } },
  { id: 'library', name: 'Shepperton Learning Room', strapline: 'Quiet tables and very loud ideas.', kind: 'training', hours: { open: 9 * 60, close: 19 * 60 } },
  { id: 'bank', name: 'Elm & Crown Bank', strapline: 'Move money somewhere slightly harder to spend.', kind: 'bank', hours: { open: 8 * 60, close: 20 * 60 } },
  { id: 'office', name: 'Thameside Services', strapline: 'Spreadsheets, headsets and proper biscuits.', kind: 'work', hours: { open: 8 * 60, close: 19 * 60 } },
  { id: 'secondhand', name: 'Second Spin', strapline: 'Pre-loved things with at least one good story.', kind: 'shop', hours: { open: 10 * 60, close: 17 * 60 } },
  { id: 'station', name: 'Shepperton Station', strapline: 'Trains today; new districts in a later milestone.', kind: 'travel', hours: { open: 5 * 60, close: 23 * 60 } },
  { id: 'community', name: 'Riverside Community Hall', strapline: 'Clubs, neighbours and surprisingly competitive quizzes.', kind: 'social', hours: { open: 9 * 60, close: 21 * 60 } },
  { id: 'green', name: 'Orchard Green', strapline: 'A pocket of calm in the middle of the village.', kind: 'social' },
  { id: 'studio', name: 'Lockside Studio', strapline: 'A creative workspace for trusted locals.', kind: 'locked', hours: { open: 10 * 60, close: 20 * 60 }, lockedRequirement: { reputation: 5 } },
];

export const JOBS: JobDefinition[] = [
  { id: 'cafe-assistant', name: 'Café Assistant', locationId: 'cafe', description: 'Serve customers and keep the toasties moving.', requirements: [], hours: { open: 8 * 60, close: 17 * 60 }, shiftMinutes: 180, pay: 36, energyCost: 24, nextJobId: 'cafe-lead' },
  { id: 'cafe-lead', name: 'Café Shift Leader', locationId: 'cafe', description: 'Keep the team calm during the lunchtime rush.', requirements: [{ attribute: 'charm', minimum: 4 }, { reputation: 4 }], hours: { open: 8 * 60, close: 17 * 60 }, shiftMinutes: 240, pay: 68, energyCost: 30 },
  { id: 'office-trainee', name: 'Office Trainee', locationId: 'office', description: 'Learn the systems and rescue the shared inbox.', requirements: [{ attribute: 'intelligence', minimum: 3 }, { attribute: 'charm', minimum: 2 }], hours: { open: 9 * 60, close: 17 * 60 }, shiftMinutes: 240, pay: 56, energyCost: 20, nextJobId: 'office-admin' },
  { id: 'office-admin', name: 'Office Administrator', locationId: 'office', description: 'Own the diary, the data and the decent stapler.', requirements: [{ attribute: 'intelligence', minimum: 6 }, { reputation: 6 }], hours: { open: 9 * 60, close: 17 * 60 }, shiftMinutes: 300, pay: 92, energyCost: 22 },
];

export const ITEMS: ItemDefinition[] = [
  { id: 'toastie', name: 'Proper Cheese Toastie', category: 'food', description: 'Warm, crisp and reliably restorative.', price: 6, resalePrice: 2, stackLimit: 5, consumable: true, soldAt: ['cafe'], effect: { energy: 22, health: 5 } },
  { id: 'spark', name: 'Surrey Spark', category: 'drink', description: 'A fizzy pick-me-up. Probably best not before bed.', price: 4, resalePrice: 1, stackLimit: 5, consumable: true, soldAt: ['shop'], effect: { energy: 16 } },
  { id: 'bands', name: 'Training Bands', category: 'training', description: 'Reduces the cash cost of future gym sessions.', price: 28, resalePrice: 14, stackLimit: 1, consumable: false, soldAt: ['secondhand'] },
  { id: 'lamp', name: 'Cosy Reading Lamp', category: 'home', description: 'A small home improvement with a big warm glow.', price: 34, resalePrice: 17, stackLimit: 1, consumable: false, soldAt: ['secondhand'] },
  { id: 'fruit-box', name: 'Village Fruit Box', category: 'food', description: 'Five a day, or at least a determined attempt.', price: 7, resalePrice: 2, stackLimit: 4, consumable: true, soldAt: ['shop'], effect: { energy: 18, health: 8 } },
];

export const ACTIVITIES: ActivityDefinition[] = [
  { id: 'gym-session', name: 'Training session', locationId: 'gym', description: '+1 Strength', moneyCost: 8, energyCost: 18, timeCost: 60, attribute: 'strength', attributeGain: 1 },
  { id: 'study-session', name: 'Focused study', locationId: 'library', description: '+1 Intelligence', moneyCost: 2, energyCost: 12, timeCost: 90, attribute: 'intelligence', attributeGain: 1 },
  { id: 'community-session', name: 'Help at the community hall', locationId: 'community', description: '+1 Charm and +2 reputation', moneyCost: 0, energyCost: 10, timeCost: 75, attribute: 'charm', attributeGain: 1, reputationGain: 2 },
  { id: 'park-chat', name: 'Join the park gathering', locationId: 'green', description: '+1 reputation', moneyCost: 0, energyCost: 4, timeCost: 45, reputationGain: 1 },
  { id: 'studio-workshop', name: 'Creative workshop', locationId: 'studio', description: '+1 Charm and +1 Intelligence', moneyCost: 12, energyCost: 10, timeCost: 90, attribute: 'charm', attributeGain: 1, reputationGain: 1, requirements: [{ reputation: 5 }] },
];

export const OBJECTIVES: ObjectiveDefinition[] = [
  { id: 'leave-home', title: 'Step into Shepperton', description: 'Leave Rosehip Court and explore the village.', event: 'left-home' },
  { id: 'visit-cafe', title: 'Find your first opportunity', description: 'Visit The Wonky Teapot on the high street.', event: 'visited:cafe' },
  { id: 'complete-shift', title: 'Earn your first pay', description: 'Take the Café Assistant job and complete a shift.', event: 'worked' },
  { id: 'buy-food', title: 'Pick up something to eat', description: 'Buy any food item.', event: 'bought-food' },
  { id: 'improve-yourself', title: 'Invest in yourself', description: 'Complete a gym or study session.', event: 'trained-or-studied' },
  { id: 'return-home', title: 'Head home', description: 'Return to Rosehip Court after a productive day.', event: 'visited:home' },
  { id: 'sleep', title: 'Call it a day', description: 'Sleep to begin a fresh morning.', event: 'slept' },
];

export const locationById = (id: string) => LOCATIONS.find((location) => location.id === id);
export const itemById = (id: string) => ITEMS.find((item) => item.id === id);
export const jobById = (id: string) => JOBS.find((job) => job.id === id);
export const activityById = (id: string) => ACTIVITIES.find((activity) => activity.id === id);
