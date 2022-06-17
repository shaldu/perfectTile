export default class WaveData {
    nextData(wave) {
        let enemys = (5*wave)**1.5
        return {
            "wave": (wave+1).toString(),
            "waveTimeToSpawn": 5,
            "waveLengthTime": 60,
            "enemyCount": enemys
        }
    }

}