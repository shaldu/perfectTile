import { Vector3, Vector2, Raycaster, Color } from '/build/three.module.js';
export default class Bullet {
    constructor(x, y, radius) {
        this.position = new Vector3(y, x, 2);
        this.radius = radius;
    }
}