import MagneticField from "./MagneticField.js";
import config from "../../Configuration.js";

import { Helios } from "../../API/helios";
import { Vector3 } from "three";
/**
 * This class is intended to be used to load magnetic field data.
 */
class FieldLoader {
    /**
     * Register the field loader as an asset handler
     * @constructor
     */
    constructor() {
        this.field_instances = [];
    }

    //   *
    //  @param {date} start Start time of data to add

    //  * @param {date} end   End time of data to add
    //  * @param {cadence} Amount of time to skip between data points
    //  * @param {Scene} scene scene instance (not threejs scene)
    //  */
    async AddTimeSeries(start, end, cadence, scene) {
        let currentDate = new Date(start);
        let endDate = new Date(end);
        let url = await Helios.get_field_lines_gong(currentDate);
        let resultFinal = await fetch(url.path);
        let data1 = await resultFinal.json();
        data1.date = new Date(data1.date);
        this._RenderData(data1, scene);
        while (currentDate <= endDate) {
            let date = currentDate;
            let sec = date.getSeconds();
            date.setSeconds(sec + cadence);
            let url = await Helios.get_field_lines_gong(date);
            currentDate = date;
            let resultFinal = await fetch(url.path);
            let data = await resultFinal.json();
            data.date = new Date(data.date);
            this._RenderData(data, scene);
        }
        return new LineManager(this.field_instances, scene);
    }

    /**
     * Render field data to the scene
     * @param {Object} data Magnetic field data
     */
    _RenderData(data) {
        let mag = new MagneticField(data);
        let field_instance = { mag: mag, data: data };
        this.field_instances.push(field_instance);
    }

    GetAssociatedSources() {
        return config.earth_sources;
    }
}
class LineManager {
    constructor(MagneticFieldInstances, scene) {
        this.scene = scene;
        this.lines = MagneticFieldInstances;
        this.previousModel = 0;
        this.current_time = this.lines[0].data.date;
        this._current_asset = -1;
    }

    async SetTime(date) {
        let chosen_index = 0;
        let dt = Math.abs(date - this.lines[0].data.date);
        // To choose the nearest date, iterate over all dates and select
        // the one with the lowest time delta from the given date
        // Start at 1 since 0 was already set above.
        for (let i = 1; i < this.lines.length; i++) {
            const stored_date = this.lines[i].data.date;
            let delta = Math.abs(date - stored_date);
            // If the time difference is smaller than the stored time difference,
            // then update to that date.
            if (delta < dt) {
                chosen_index = i;
                dt = delta;
            }
        }

        this.lines[chosen_index].mag.GetRenderableModel();
        this._AddAsset(this.scene, this.lines[chosen_index].mag);
        this.previousModel = this.lines[chosen_index].mag;
        this.current_time = this.lines[chosen_index].data.date;
    }

    SetLayerOrder() {}

    GetFrameCount() {
        return this.lines.length;
    }

    GetPosition() {
        return new Vector3(0, 0, 0);
    }

    async GetObserverPosition() {
        return await Helios.GetEarthPosition(this.current_time);
    }

    SetOpacity(opacity) {
        this.previousModel.SetOpacity(opacity);
    }

    _RemoveAsset() {
        if (this._current_asset != -1) {
            this.scene.DeleteAsset(this._current_asset);
        }
    }

    async _AddAsset(scene, instance) {
        this._RemoveAsset();
        this._current_asset = await scene.AddAsset(instance);
    }

    dispose() {
        this._RemoveAsset();
        for (const field of this.lines) {
            field.mag.dispose();
        }
    }
}
export { FieldLoader };
