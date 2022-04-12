import { Vector3, Vector2, Raycaster, Color } from '/build/three.module.js';
import * as THREE from '/build/three.module.js';
import { Clock } from '/build/three.module.js';
import { OrbitControls } from './COrbitControls.js';
import Stats from '/examples/jsm/libs/stats.module.js';
import PRNG from './prng/prng.js';


// const socket = io({ transports: ['websocket'], upgrade: false, autoConnect: true, reconnection: false });

// socket.onAny((event, ...args) => {
//     console.log(event, args);
// });


// if (!socket.connected) {
//     socket.connect();
//     console.log("connected");
// }

//init all variables
let scene, camera, renderer, controls, raycaster, mouse, clock, prng, mesh, dummy, stats, sectionWidth, count, enemys, mousePos, wave, stopRender = false,
    timeUpdate = 0;

function initThree() {
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
    controls.enablePan = true;

    clock = new Clock();
    mousePos = new Vector3(0, 0, 0);

    //set control position and look at
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);

    controls.update();

    stats = Stats()
    document.body.appendChild(stats.dom)

    prng = new PRNG(Date.now());

    let player = new Player();
    wave = new Wave(5, 60, 15, 1, player);
    animate();
}

//create animation loop
function animate() {
    if (stopRender) {
        console.log('lol');
    } else {
        requestAnimationFrame(animate);
    }


    renderer.render(scene, camera);
    controls.update();

    if (wave) {
        wave.moveInstancedMeshes();
    }

    //1 sec timer
    if (timeUpdate >= 1) {
        timeUpdate = 0;
        wave.reduceTime();
    } else {
        timeUpdate += clock.getDelta();
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

export class Enemy {
    constructor(x, y, level) {
        this.initialPosition = new Vector3(x, y, 0);
        this.position = new Vector3(x, y, 0);
        this.isDead = false;
        this.damage = 1;
        // this.speed = randomRange(0.001, 0.005);
        this.speed = 0.00005 + (level * 0.0002);
    }

    //find fix for this, currentry faster on out side and slow on inside
    moveTowards(x, y) {
        this.position.x += ((x - this.initialPosition.x) * this.speed);
        this.position.y += ((y - this.initialPosition.y) * this.speed);
    }

    kill() {
        this.speed = 0;
        this.position.z = -1;
        this.isDead = true;
    }
}

export class Player {
    constructor() {
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.level = 1;
        this.isDead = false;
        this.exp = 0;
        this.expToNextLevel = 100;

        this.createPlayerSprite();
        this.updateHealthProgressbar();
    }

    gameOver() {
        this.isDead = true;
        if (this.isDead) {
            this.health = 0;
            stopRender = true;
            //show game over screen
        }
    }

    createPlayerSprite() {
        //create player sprite
        const texture = new THREE.TextureLoader().load('/assets/gameAssets/player.png');
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        let playerGeometry = new THREE.PlaneGeometry(1, 1);
        let playerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, map: texture });
        let playerSprite = new THREE.Mesh(playerGeometry, playerMaterial);
        //add mipmap nearest to avoid blurry textures

        playerSprite.scale.set(2, 2, 2);
        playerSprite.position.set(0, 0, 1);
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

    endWave() {}

    startWave() {
        this.waveStarted = true;
        this.createWaveSpawner(this.enemyCount);
    }

    spawnEnemys() {
        for (let i = 0; i < this.enemyCount; i++) {
            let enemy = new Enemy(0, 0);
            enemys.push(enemy);
        }
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
            enemys.push(new Enemy(spawnPosition.x, spawnPosition.y, this.waveLevel));


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

    //TODO: change this to a loop for each enemy instead of a for instance loop
    moveInstancedMeshes() {
        if (this.waveStarted) {
            for (let i = 0; i < this.enemyCount; i++) {
                if (enemys[i].isDead) {
                    continue;
                }

                //get enemy
                let enemy = enemys[i];

                enemy.moveTowards(camera.position.x, camera.position.y);
                let position = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
                let cameraPosNoZ = new THREE.Vector3(camera.position.x, camera.position.y, 0);

                let distance = enemys[i].position.distanceTo(cameraPosNoZ)

                if (distance < 1.5) {
                    enemys[i].isDead = true
                    this.player.takeDamage(enemys[i].damage);
                } else {

                }

                if (enemy.isDead) {
                    let color = new Color(0x000000);
                    mesh.setColorAt(i, color);
                } else {

                }

                let matrix = new THREE.Matrix4();
                matrix.setPosition(position);

                mesh.setMatrixAt(i, matrix);
                mesh.matrixWorldNeedsUpdate = true;
                mesh.instanceMatrix.needsUpdate = true;
                mesh.instanceColor.needsUpdate = true;
            }
        }
    }
}

initThree();