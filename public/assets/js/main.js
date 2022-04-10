import { Vector3, Vector2, Raycaster, Color } from '/build/three.module.js';
import * as THREE from '/build/three.module.js';
import { Clock } from '/build/three.module.js';
import { OrbitControls } from './COrbitControls.js';
import Stats from '/examples/jsm/libs/stats.module.js';
import PRNG from './prng/prng.js';





const URL = "http://localhost:3000";
// const socket = io({ transports: ['websocket'], upgrade: false, autoConnect: true, reconnection: false });

// socket.onAny((event, ...args) => {
//     console.log(event, args);
// });


// if (!socket.connected) {
//     socket.connect();
//     console.log("connected");
// }

//init all variables
let scene, camera, renderer, controls, raycaster, mouse, clock, prng, mesh, dummy, stats, sectionWidth, count, enemys, mousePos;

function initThree() {
    //init three js 
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    //init controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = false;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.minDistance = 1;
    controls.maxDistance = 10000;
    controls.enablePan = true;


    mousePos = new Vector3(0, 0, 0);

    //set control position and look at
    camera.position.set(0, 0, 20);
    camera.lookAt(0, 0, 0);


    controls.update();

    stats = Stats()
    document.body.appendChild(stats.dom)

    prng = new PRNG(Date.now());

    count = 10000;

    const texture = new THREE.TextureLoader().load('/assets/gameAssets/circle.png');

    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true
    });

    mesh = new THREE.InstancedMesh(geometry, material, count);

    let minDistance = 60.0;
    let maxDistance = clampValue(count, 60, 10000);

    //init enemy
    enemys = [];

    //for each instance
    for (let i = 0; i < count; i++) {

        let matrix = new THREE.Matrix4();

        let distance = randomRange(minDistance, maxDistance);
        if (prng.getRandomBoolWithWeightPercentage(0.3)) {
            distance = randomRange(minDistance + (maxDistance * 0.7), maxDistance);
        }
        let angle = randomRange(-Math.PI, Math.PI);

        let spawnPosition = new Vector3(Math.cos(angle) * distance, Math.sin(angle) * distance, 0);

        //create enemy and add to array
        enemys.push(new Enemy(spawnPosition.x, spawnPosition.y));


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
    let wave = new Wave(10, 300, 20, 2);
    animate();
}

//create animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
    moveInstancedMeshes();
    stats.update()
}

//calculate mouse position on screen
function onMouseMove(event) {
    // camera.position.x + (((event.clientX / window.innerWidth) * 2 - 1) * camera.position.z);

    mousePos.x = (((event.clientX / window.innerWidth) * 2 - 1) * camera.position.z) + camera.position.x;
    mousePos.y = -(((event.clientY / window.innerHeight) * 2 - 1) * camera.position.z) + camera.position.y;

}

//create mouse move event
window.addEventListener('mousemove', onMouseMove, false);

function clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function moveInstancedMeshes() {
    //for each enemy

    for (let i = 0; i < count; i++) {


        if (enemys[i].isDead) {
            continue;
        }

        //get enemy
        let enemy = enemys[i];

        enemy.moveTowards(camera.position.x, camera.position.y);
        let position = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
        let cameraPosNoZ = new THREE.Vector3(camera.position.x, camera.position.y, 0);

        let distance = enemys[i].position.distanceTo(cameraPosNoZ)

        if (distance < 12) {
            enemys[i].isDead = true
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

export class Enemy {
    constructor(x, y) {
        this.position = new Vector3(x, y, 0);
        this.isDead = false;
        // this.speed = randomRange(0.001, 0.005);
        this.speed = 0.001;
    }

    //create a move towards function
    moveTowards(x, y) {
        this.position.x += (x - this.position.x) * this.speed;
        this.position.y += (y - this.position.y) * this.speed;
    }

    kill() {
        this.speed = 0;
        this.position.z = -1;
        this.isDead = true;
    }
}


//create a wave class
export class Wave {
    constructor(waveTimeToSpawn, waveLengthTime, enemyCount, waveLevel) {
        this.waveTimeToSpawn = waveTimeToSpawn;
        this.waveLengthTime = waveLengthTime;
        this.enemyCount = enemyCount;
        this.waveLevel = waveLevel;
        this.waveStarted = false;
        this.waveEnded = false;
        this.waveTimer = waveLengthTime;
        this.waveTimeToSpawnTimer = waveTimeToSpawn;
        this.waveTimeInterval;
        this.startTimerForWaveStart();
    }

    startTimerForWaveStart() {
        let waveTimeToSpawnInterval = setInterval(() => {
            this.waveTimeToSpawnTimer--;
            console.log(this.waveTimeToSpawnTimer);
            this.updateWaveTimerVisual(this.waveTimeToSpawnTimer, false);
            if (this.waveTimeToSpawnTimer <= 0) {
                this.startWave();
                clearInterval(waveTimeToSpawnInterval);
            }
            if (this.waveStarted) {
                clearInterval(waveTimeToSpawnInterval);
            }
        }, 1000);
    }

    startWave() {
        this.waveStarted = true;

        //wave loop timer
        this.waveTimeInterval = setInterval(() => {
            this.updateWaveTimer();
            if (this.waveTimer < 0) {
                this.waveEnded = true;
                clearInterval(this.waveTimeInterval);
            }
        }, 1000);
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
}

initThree();