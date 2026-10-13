import { angleDifference, clamp } from '@/game/core/math/angles';
import { Vector2 } from '@/game/core/math/Vector2';
import type { Ship } from '../entities/Ship';
import type { SimulationContext } from '../SimulationContext';

/** Angles (radians) tried on each side of the desired heading when it is blocked. */
const AVOIDANCE_ANGLES = [0.45, 0.9, 1.35, 1.8, 2.4];
const FALLBACK_AVOIDANCE_ANGLE = Math.PI * 0.75;
const MIN_LOOKAHEAD = 110;
const LOOKAHEAD_SECONDS = 1.1;
/** Feelers on both sides of the hull, as a fraction of the radius, so the ship's width clears the coast. */
const HULL_FEELER_OFFSET = 0.9;
const SHARP_TURN_ANGLE = 1.4;
const SHARP_TURN_THROTTLE = 0.45;
const PROGRESS_CHECK_SECONDS = 1;
const MIN_PROGRESS_DISTANCE = 12;
const ESCAPE_SECONDS = 0.7;
const ESCAPE_THROTTLE = 0.7;
const CLEARANCE_TOLERANCE = 0.5;

/** Turn input in [-1, 1] that reaches the heading error without overshooting in one step. */
export function turnInputFor(ship: Ship, headingError: number, stepSeconds: number): number {
  const maxTurnPerStep = ship.turnSpeed * stepSeconds;
  return maxTurnPerStep > 0 ? clamp(headingError / maxTurnPerStep, -1, 1) : 0;
}

/**
 * Obstacle-aware steering shared by the enemy behaviours: feelers pick a free heading around islands,
 * the preferred side is remembered to avoid oscillation, and a short escape manoeuvre (deterministic,
 * using the match random generator) frees a ship that stopped making progress.
 */
export class SteeringNavigator {
  steerTowards(ship: Ship, target: Vector2, context: SimulationContext): void {
    const navigation = ship.navigation;
    if (!navigation) return;
    const { stepSeconds } = context;

    if (navigation.isEscaping) {
      navigation.escapeSecondsRemaining -= stepSeconds;
      ship.setControls(ESCAPE_THROTTLE, navigation.escapeTurnDirection);
      return;
    }

    const distanceToTarget = ship.position.distanceTo(target);
    const lookahead = Math.min(distanceToTarget, Math.max(MIN_LOOKAHEAD, ship.speed * LOOKAHEAD_SECONDS) + ship.radius);
    const heading = this.chooseHeading(ship, ship.position.angleTo(target), lookahead, context);
    const headingError = angleDifference(ship.heading, heading);
    ship.setControls(
      Math.abs(headingError) > SHARP_TURN_ANGLE ? SHARP_TURN_THROTTLE : 1,
      turnInputFor(ship, headingError, stepSeconds),
    );
    this.checkProgress(ship, context);
  }

  private chooseHeading(ship: Ship, desiredHeading: number, lookahead: number, context: SimulationContext): number {
    const navigation = ship.navigation;
    if (!navigation || this.isHeadingClear(ship, desiredHeading, lookahead, context)) return desiredHeading;
    const preferredSide = navigation.preferredAvoidanceSide;
    for (const angle of AVOIDANCE_ANGLES) {
      for (const side of [preferredSide, preferredSide === 1 ? -1 : 1] as const) {
        const candidate = desiredHeading + side * angle;
        if (this.isHeadingClear(ship, candidate, lookahead, context)) {
          navigation.preferredAvoidanceSide = side;
          return candidate;
        }
      }
    }
    return desiredHeading + preferredSide * FALLBACK_AVOIDANCE_ANGLE;
  }

  /** A heading is clear when three parallel feelers (centre and both sides of the hull) reach the lookahead. */
  private isHeadingClear(ship: Ship, heading: number, lookahead: number, context: SimulationContext): boolean {
    const sideOffset = Vector2.fromAngle(heading)
      .leftPerpendicular()
      .scale(ship.radius * HULL_FEELER_OFFSET);
    const feelerOrigins = [ship.position, ship.position.add(sideOffset), ship.position.subtract(sideOffset)];
    return feelerOrigins.every(
      (origin) => context.arena.measureClearance(origin, heading, lookahead) >= lookahead - CLEARANCE_TOLERANCE,
    );
  }

  private checkProgress(ship: Ship, context: SimulationContext): void {
    const navigation = ship.navigation;
    if (!navigation) return;
    navigation.secondsSinceProgressCheck += context.stepSeconds;
    if (navigation.secondsSinceProgressCheck < PROGRESS_CHECK_SECONDS) return;
    if (navigation.lastProgressPosition.distanceTo(ship.position) < MIN_PROGRESS_DISTANCE) {
      navigation.startEscape(ESCAPE_SECONDS, context.random.sign());
    }
    navigation.markProgress(ship.position);
  }
}
