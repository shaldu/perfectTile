import { Vector3, Vector2, Raycaster, Color } from '/build/three.module.js';
import * as THREE from '/build/three.module.js';

export default class Enemy {
    constructor(x, y, level, id, mesh) {
        this.enemyID = id;
        this.mesh = mesh;
        this.distance;
        this.initialPosition = new Vector3(x, y, 0);
        this.position = this.initialPosition;
        this.isDead = false;
        this.damage = 1;
        this.life = 2 + (0.25 * level);
        // this.speed = randomRange(0.001, 0.005);
        this.speed = this.randomRange(5, 14.5) + (level * 0.25);
    }

    moveTowards(x, y, deltaTime) {
        this.distance = this.position.distanceTo(new THREE.Vector3(0, 0, 0))
        let normalizedVector = this.normalizeVector(new THREE.Vector3(x, y, 0).sub(this.position));
        this.position.x += normalizedVector.x * this.speed * deltaTime;
        this.position.y += normalizedVector.y * this.speed * deltaTime;
    }

    takeDamage(damage, player) {
        this.life -= damage;
        if (this.life <= 0) {
            this.kill(player);
        }
    }

    kill(player) {
        this.speed = 0;
        this.position.z = -10;
        this.isDead = true;
        let color = new Color(0x000000);
        this.mesh.setColorAt(this.enemyID, color);
        player.enemyTarget = undefined;
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    //normalize vector 
    normalizeVector(v, out) {
        out = out || new Vector3();
        let length = v.length();
        out.x = v.x / length;
        out.y = v.y / length;
        out.z = v.z / length;
        return out;
    }

}