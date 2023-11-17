import Config from "../Configuration.js";
import { ToDateString } from "../common/dates";
import { ToCoordinates } from "./common";
import { Favorite, Favorites } from "./favorites";
import { PFSS, ParsePfssBundle } from "../common/pfss";
import * as HeliosAPI from './helios/api';

const config = {basePath: Config.helios_api_url};
let api = {
    data: new HeliosAPI.DataApi(config),
    ephemeris: new HeliosAPI.EphemerisApi(config),
    scene: new HeliosAPI.SceneApi(config)
}

class Helios {
    /**
     * Returns the observer position of a jp2 image
     * @param {number} id ID of the jp2 image
     * @returns Coordinates
     */
    static async GetJp2Observer(id) {
        const result = await api.ephemeris.getJp2Observer(id);
        return ToCoordinates(result);
    }

    static async SaveScene(favorite: Favorite): Promise<number> {
        let result = await api.scene.saveScene(favorite);
        return result.id;
    }

    static async LoadScene(id: number): Promise<Favorite> {
        let scene = await api.scene.getScene(id);
        return Favorites.RestoreDates([scene as Favorite])[0];
    }

    static async GetRecentlyShared(): Promise<Favorite[]> {
        let result = await api.scene.getRecentlyShared(10);
        return Favorites.RestoreDates(result.scenes);
    }

    static async get_field_lines_gong(
        date: Array<Date>
    ): Promise<PFSS[]> {
        // Construct a query string in the form date=<date1>&date=<date2>...
        let date_strings = date.map((d) => "date=" + ToDateString(d));
        let query_params = date_strings.join("&");
        let url =
            Config.helios_api_url +
            "pfss/gong/?detail=" +
            query_params;
        let response = await fetch(url);
        let reader = response.body.getReader();
        return await ParsePfssBundle(reader);
    }

    static async GetEarthPosition(date: Date) {
        let coordinate = await api.ephemeris.getEarthPosition(ToDateString(date));
        return ToCoordinates(coordinate);
    }
}

export { Helios };
