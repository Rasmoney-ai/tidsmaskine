// The user's own hands (optional hand tracking): three's XR hand mesh model, skinned to the tracked joints.
// The model files are in vendor/hands (no CDN). Pinch and pointing still come from the input sources in main.js.
import { XRHandModelFactory } from '../vendor/three/addons/webxr/XRHandModelFactory.js';

export function buildHands(renderer, parent) {
  const factory = new XRHandModelFactory().setPath('vendor/hands/');
  for (const i of [0, 1]) {
    const hand = renderer.xr.getHand(i);
    hand.add(factory.createHandModel(hand, 'mesh'));
    parent.add(hand);
  }
  return { update() {} };   // the hand models follow their joints by themselves
}
