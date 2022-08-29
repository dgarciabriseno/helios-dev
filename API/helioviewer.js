import Config from '../Configuration.js';
import {ToAPIDate} from "../common/dates.js";

/**
 * This module is used for interfacing with the Helioviewer API
 * The goal of this module is to create a javascript interface
 * that can be used to request specific information from Helioviewer
 * that will be used to enable finding images for Helios.
 */

/**
 * Helioviewer API Client.
 * Allows making API calls to the helioviewer server
 */
class Helioviewer {
    /**
     * Gets the API URL used for making requests
     *
     * @returns {string} URL
     */
    GetApiUrl() {
        let url = Config.helioviewer_url;
        if (!url.endsWith('/')) {
            url = url + "/";
        }
        return url + "v2/";
    }

    /**
     * Queries the helioviewer API for the image nearest to the given time.
     * @param {number} source Telescope source ID
     * @param {Date} time Timestamp to query
     * @returns {ImageInfo}
     * @private
     */
    async _GetClosestImage(source, time) {
        let api_url = this.GetApiUrl() + "getClosestImage/?sourceId=" + source + "&date=" + ToAPIDate(time);
        let result = await fetch(api_url);
        let image = await result.json();
        return {id: image.id, timestamp: new Date(image.date)};
    }

    /**
     * @typedef {Object} ImageInfo
     * @property {number} id Image ID
     * @property {Date} timestamp Timestamp for this image
     */
    /**
     * Returns a list of Image IDs for the specified time range
     *
     * @param {number} source The desired telescope's source Id
     * @param {Date} start Beginning of time range to get images for
     * @param {Date} end End of time range to get images for
     * @param {number} cadence Number of seconds between each image
     * @returns {ImageInfo[]}
     */
    async QueryImages(source, start, end, cadence) {
        let results = [];
        let query_time = new Date(start);

        // Iterate over the time range, adding "cadence" for each iteration
        while (query_time < end) {
            // Query Helioviewer for the closest image to the given time.
            let image = await this._GetClosestImage(source, query_time);
            // Add the result to the output array
            results.push(image);
            // Add cadence to the query time
            // A neat trick for setSeconds is if seconds > 60, it proceeds to update
            // the minutes, hours, etc.
            query_time.setSeconds(query_time.getSeconds() + cadence);
        }

        return results;
    }

    /**
     * Returns a URL that will return a PNG of the given image
     *
     * @param {number} id The ID of the image to get
     * @param {number} scale The image scale to request in the URL
     * @returns {string} URL of the image
     */
    GetImageURL(id, scale) {
        let url = this.api_url + "downloadImage/?id=" + id + "&scale=" + scale;
        return url;
    }
}

let SingletonAPI = new Helioviewer();
export default SingletonAPI;
