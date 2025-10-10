import { EventEmitter } from 'events';

// Create a single, shared instance of the event emitter
const dashboardEventEmitter = new EventEmitter();

export { dashboardEventEmitter };
