import { Vector3, Vector2, Raycaster, Color } from '/build/three.module.js';
import * as THREE from '/build/three.module.js';
import { Clock } from '/build/three.module.js';
import { OrbitControls } from './COrbitControls.js';
import Stats from '/examples/jsm/libs/stats.module.js';
import PRNG from './prng/prng.js';
import WaveData from './waveData.js';

// const socket = io({ transports: ['websocket'], upgrade: false, autoConnect: true, reconnection: false });

// socket.onAny((event, ...args) => {
//     console.log(event, args);
// });


// if (!socket.connected) {
//     socket.connect();
//     console.log("connected");
// }

//init all variables
let scene, camera, renderer, deltaTime, controls, raycaster, mouse, clock, prng, mesh, dummy, stats, sectionWidth, count, enemys, mousePos, wave, stopRender = false,
    timeUpdate = 0,
    waveData,
    wavelevel = 0

function initThree() {

    waveData = new WaveData().data;

    //init three js 
    scene = new THREE.Scene();
    //add orthographic camera with zoom variable
    let zoom = 50;
    camera = new THREE.OrthographicCamera(-window.innerWidth / zoom, window.innerWidth / zoom, window.innerHeight / zoom, -window.innerHeight / zoom, 1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 1);
    renderer.anisotropy = 0;
    document.body.appendChild(renderer.domElement);

    //init controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = false;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.enablePan = false;

    clock = new Clock();
    clock.start();
    mousePos = new Vector3(0, 0, 0);

    //set control position and look at
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    controls.update();

    stats = Stats()
    document.body.appendChild(stats.dom)

    prng = new PRNG(Date.now());

    let player = new Player();
    createNewWave(player);
    animate();
}

function createNewWave(player) {

    wavelevel++;
    let data = waveData[wavelevel - 1];
    console.log(data);
    wave = new Wave(data.waveTimeToSpawn, data.waveLengthTime, data.enemyCount, wavelevel, player);
    //get waveRound div element and set wavelevel
    document.getElementById('waveRound').innerHTML = "Wave: " + wavelevel;
}


//create animation loop
function animate() {

    if (stopRender) {

    } else {
        requestAnimationFrame(animate);
    }

    renderer.render(scene, camera);
    controls.update();

    deltaTime = clock.getDelta();

    if (wave) {
        wave.moveInstancedMeshes();
        wave.player.update();
    }

    //1 sec timer
    if (timeUpdate >= 1) {
        timeUpdate = 0;
        wave.reduceTime();
    } else {
        timeUpdate += deltaTime;
    }
    stats.update()

}

//calculate mouse position on screen
function onMouseMove(event) {
    // camera.position.x + (((event.clientX / window.innerWidth) * 2 - 1) * camera.position.z);

    mousePos.x = (((event.clientX / window.innerWidth) * 2 - 1) * camera.position.z) + camera.position.x;
    mousePos.y = -(((event.clientY / window.innerHeight) * 2 - 1) * camera.position.z) + camera.position.y;

}

//mouse scroll event listener
window.addEventListener('wheel', function(event) {

});

//create mouse move event
window.addEventListener('mousemove', onMouseMove, false);

function clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

//normalize vector 
function normalizeVector(v, out) {
    out = out || new Vector3();
    let length = v.length();
    out.x = v.x / length;
    out.y = v.y / length;
    out.z = v.z / length;
    return out;
}


export class Enemy {
    constructor(x, y, level, id) {
        this.enemyID = id;
        this.distance;
        this.initialPosition = new Vector3(x, y, 0);
        this.position = this.initialPosition;
        this.isDead = false;
        this.damage = 1;
        this.life = 2 + (0.25 * level);
        // this.speed = randomRange(0.001, 0.005);
        this.speed = randomRange(5, 14.5) + (level * 0.25);
    }

    moveTowards(x, y) {
        this.distance = this.position.distanceTo(new THREE.Vector3(0, 0, 0))
        let normalizedVector = normalizeVector(new THREE.Vector3(x, y, 0).sub(this.position));
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
        mesh.setColorAt(this.enemyID, color);
        player.enemyTarget = undefined;
    }
}

export class Projectile {
    constructor(enemyTarget, damage, speed, radius, lifespan, textureUrl, color, player) {
        this.damage = damage;
        this.speed = speed;
        this.textureUrl = textureUrl;
        this.color = color;
        this.radius = radius;
        this.lifespan = lifespan;
        this.position = new Vector3(0, 0, 2);
        this.bullet = null;
        this.enemyTarget = enemyTarget;
        this.player = player;
        this.createBullet();
    }

    //create a bullet with three js
    createBullet() {
        const texture = new THREE.TextureLoader().load(this.textureUrl);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: this.color,
            map: texture,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });

        this.bullet = new THREE.Mesh(geometry, material);
        this.bullet.scale.set(this.radius, this.radius, this.radius);
        this.bullet.position.set(this.position.x, this.position.y, 2);
        scene.add(this.bullet);
    }

    moveTo() {
        if (this.enemyTarget != null) {

            let normalizedVector = normalizeVector(new THREE.Vector3(this.enemyTarget.position.x, this.enemyTarget.position.y, 0).sub(this.position));
            this.position.x += normalizedVector.x * this.speed * deltaTime;
            this.position.y += normalizedVector.y * this.speed * deltaTime;
            this.bullet.position.set(this.position.x, this.position.y, 2);
            this.position.z = 0;

            if (this.enemyTarget.isDead) {
                this.player.removeProjectile(this);
            }


            if (this.position.distanceTo(this.enemyTarget.position) <= this.radius) {
                this.enemyTarget.takeDamage(this.damage, this.player);
                this.player.removeProjectile(this);
            }
        }
    }



}

export class Player {
    constructor() {
        this.enemyTarget;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.level = 1;
        this.isDead = false;
        this.exp = 0;
        this.expToNextLevel = 100;
        this.attackSpeed = 0.02;
        this.attackTimer = 0;
        this.projectiles = [];
        this.createPlayerSprite();
        this.updateHealthProgressbar();
    }

    update() {
        //create a projectile every attackSpeed
        if (this.enemyTarget != null) {
            if (this.attackTimer >= this.attackSpeed) {
                this.attackTimer = 0;
                this.shoot();

            } else {
                this.attackTimer += deltaTime;
            }
        }
        if (this.projectiles.length > 0) {
            this.projectiles.forEach(projectile => {
                //move projectile

                projectile.moveTo();
            });
        }

    }

    removeProjectile(projectile) {
        //remove projectile from array
        this.projectiles.splice(this.projectiles.indexOf(projectile), 1);
        scene.remove(projectile.bullet);
    }

    shoot() {
        const projectile = new Projectile(this.enemyTarget, 5, 55, 1, 0.5, '/assets/gameAssets/circle.png', 0x00ffff, this);
        this.projectiles.push(projectile);
    }


    gameOver() {
        this.isDead = true;
        if (this.isDead) {
            this.health = 0;
            stopRender = true;
            //show game over screen
            const gameOver = document.querySelector('.game-over');
            gameOver.querySelector("button").addEventListener("click", () => { window.location.reload() });
            gameOver.classList.add("show");
        }
    }

    createPlayerSprite() {
        //create player sprite
        const texture = new THREE.TextureLoader().load('/assets/gameAssets/player.png');
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        let playerGeometry = new THREE.PlaneGeometry(1, 1);
        let playerMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });
        let playerSprite = new THREE.Mesh(playerGeometry, playerMaterial);
        //add mipmap nearest to avoid blurry textures

        playerSprite.scale.set(2, 2, 2);
        playerSprite.position.set(0, 0, 5);
        scene.add(playerSprite);
    }

    updateHealthProgressbar() {
        let healthProgressbar = document.getElementById('player-health-pb');
        healthProgressbar.style.width = ((this.health / this.maxHealth) * 100) + '%';
    }

    takeDamage(damage) {
        this.health -= damage;
        this.updateHealthProgressbar();
        if (this.health <= 0) {
            this.gameOver();
        }
    }
    getExp(exp) {
        this.exp += exp;
        if (this.exp >= this.expToNextLevel) {
            this.exp = 0;
            this.levelUp();
        }
    }
    levelUp() {
        this.level++;
        this.expToNextLevel = this.expToNextLevel * 2;
    }

}

//create a wave class
export class Wave {
    constructor(waveTimeToSpawn, waveLengthTime, enemyCount, waveLevel, player) {
        this.waveTimeToSpawn = waveTimeToSpawn;
        this.waveLengthTime = waveLengthTime;
        this.enemyCount = enemyCount;
        this.waveLevel = waveLevel;
        this.waveStarted = false;
        this.waveEnded = false;
        this.waveTimer = waveLengthTime;
        this.waveTimeInterval;
        this.player = player;
    }

    reduceTime() {
        if (this.waveStarted) {
            this.waveTimer--;
            this.updateWaveTimerVisual(this.waveTimer, true);
            if (this.waveTimer <= 0) {
                this.endWave();
            }
        } else {
            this.waveTimeToSpawn--;
            this.updateWaveTimerVisual(this.waveTimeToSpawn, false);
            if (this.waveTimeToSpawn <= 0) {
                this.startWave();
            }
        }
    }

    endWave() {
        if (!this.waveEnded) {
            this.waveEnded = true;
            scene.remove(mesh);
            this.player.enemyTarget = undefined;
            enemys = [];
            createNewWave(this.player);
        }
    }

    startWave() {
        this.waveStarted = true;
        this.createWaveSpawner(this.enemyCount);
    }

    updateWaveTimer() {
        this.waveTimer--;
        this.updateWaveTimerVisual(this.waveTimer, true);
    }

    updateWaveTimerVisual(seconds, roundStartet) {

        //turn seconds into minutes and seconds
        let minutes = Math.floor(seconds / 60);
        let secondsLeft = seconds % 60;
        //add leading zero
        minutes = minutes < 10 ? "0" + minutes : minutes;
        secondsLeft = secondsLeft < 10 ? "0" + secondsLeft : secondsLeft;
        //display timer

        if (roundStartet) {
            document.getElementById("timer").innerHTML = "Survive for " + minutes + ":" + secondsLeft;
        } else {
            document.getElementById("timer").innerHTML = "Wave starts in " + minutes + ":" + secondsLeft;
        }
    }

    createWaveSpawner(count) {
        const texture = new THREE.TextureLoader().load('/assets/gameAssets/circle.png');
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        const scale = 0.5;
        const geometry = new THREE.PlaneGeometry(scale, scale);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });

        mesh = new THREE.InstancedMesh(geometry, material, count);

        let minDistance = 40.0;
        let maxDistance = clampValue(count, 100, 10000);

        //init enemy
        enemys = [];

        //for each instance
        for (let i = 0; i < count; i++) {

            let matrix = new THREE.Matrix4();

            let distance = randomRange(minDistance, maxDistance);
            if (prng.getRandomBoolWithWeightPercentage(0.1)) {
                distance = randomRange(minDistance + (maxDistance * 0.7), maxDistance);
            }
            let angle = randomRange(-Math.PI, Math.PI);

            let spawnPosition = new Vector3(Math.cos(angle) * distance, Math.sin(angle) * distance, 0);

            //create enemy and add to array
            enemys.push(new Enemy(spawnPosition.x, spawnPosition.y, this.waveLevel, i));


            //set the matrix
            matrix.makeTranslation(
                spawnPosition.x,
                spawnPosition.y,
                0
            );


            //create quaternion
            let quaternion = new THREE.Quaternion();
            //create scale
            let scale = new Vector3(1, 1, 1);

            let color = new Color(0xffffff);
            mesh.setColorAt(i, color);

            matrix.compose(spawnPosition, quaternion, scale);

            mesh.setMatrixAt(i, matrix)

            matrix.needsUpdate = true;
            mesh.needsUpdate = true;
            mesh.instanceColor.needsUpdate = true;
        }
        mesh.matrixWorldNeedsUpdate = true;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.instanceColor.needsUpdate = true;


        scene.add(mesh);
    }

    moveInstancedMeshes() {
        let deadEnemyCount = 0;
        if (typeof(enemys) != "undefined" && enemys.length > 0) {
            for (let i = 0; i < this.enemyCount; i++) {

                const enemy = enemys[i];
                if (typeof(enemy) == "undefined")
                    continue;
                if (enemy.isDead) {
                    deadEnemyCount++;
                    continue;
                }


                enemy.moveTowards(camera.position.x, camera.position.y);
                const position = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
                const cameraPosNoZ = new THREE.Vector3(camera.position.x, camera.position.y, 0);

                const distance = enemy.position.distanceTo(cameraPosNoZ)

                let isTarget = false;
                let isTargetSkip = false;

                if (distance < 1.5) {
                    enemy.kill(this.player);
                    this.player.takeDamage(enemy.damage);
                    continue;
                } else {

                }

                if (typeof(this.player.enemyTarget) == "undefined") {
                    this.player.enemyTarget = enemy;
                    isTargetSkip = true;
                }

                if (!isTargetSkip && distance - 0.001 <= this.player.enemyTarget.distance) {
                    this.player.enemyTarget = enemy;
                    isTarget = true;
                }

                if (enemy.isDead) {
                    let color = new Color(0x000000);
                    mesh.setColorAt(i, color);

                    if (isTarget) {
                        this.player.enemyTarget = undefined;
                    }

                    continue;
                } else {

                    if (isTarget) {
                        //add color red
                        let color = new Color(0xff0000);
                        mesh.setColorAt(i, color);
                    } else {
                        //add color red
                        let color = new Color(0xffffff);
                        mesh.setColorAt(i, color);
                    }
                }

                let matrix = new THREE.Matrix4();
                matrix.setPosition(position);

                mesh.setMatrixAt(enemy.enemyID, matrix);
                mesh.matrixWorldNeedsUpdate = true;
                mesh.instanceMatrix.needsUpdate = true;
                mesh.instanceColor.needsUpdate = true;

            }
        }
        if (deadEnemyCount === this.enemyCount) {
            if (this.waveStarted) {
                this.endWave();
            }
        }
    }
}

initThree();