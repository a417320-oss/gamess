
import { Wall } from '../types';

/**
 * Check if two Axis-Aligned Bounding Boxes (AABB) overlap
 * @param rect1 - First rectangle entity
 * @param rect2 - Second rectangle entity
 * @returns true if overlapping
 */
export const checkAABB = (
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

/**
 * Checks if an entity collides with any wall in the provided list
 * @param entity - The entity to check
 * @param walls - List of walls
 * @returns true if collision detected
 */
export const checkWallCollision = (entity: { x: number; y: number; width: number; height: number }, walls: Wall[]): boolean => {
    return walls.some(w => checkAABB(entity, w));
};

export const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Checks if a line segment (x1,y1) to (x2,y2) intersects with a rectangle
 * Used for AI Line of Sight
 */
export const checkLineRectCollide = (x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number): boolean => {
    // Check if line is completely outside the rectangle (Optimization)
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) return false;

    // Check intersection with each of the 4 borders
    // Simplified: We can check if any point on the line is inside the rect
    // For AI LOS, stepping is usually sufficient and cheaper than full geometry
    const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 10);
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let i = 0; i <= steps; i++) {
        const px = x1 + dx * i;
        const py = y1 + dy * i;
        if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
            return true;
        }
    }
    return false;
};
