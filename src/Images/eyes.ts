import { loadPyodide } from "pyodide";
import Coordinate from "../common/coordinates";

/**
 * The eyes in the sky capable of pointing to any object.
 *
 * Powered by pyodide/sunpy/JPL Horizons
 */
class Eyes {
    /**
     * pyodide instance for running Python commands
     */
    public pyodide;

    private get_horizons_coord;
    private get_earth;
    private _get_coord;
    /**
     * Converts a js date to a python date
     */
    public to_pydate;

    /**
     *
     */
    public to_py;

    /**
     * promise that resolves when pyodide is ready to use.
     */
    private _preparation;

    constructor() {
        this._preparation = this._prepare();
    }

    _date_to_pydates(dates: Date[]) {
        // Convert js datetimes to python datetimes
        let pydates = dates.map((d) => this.to_pydate(d));
        // Convert js list of python date times to python list of python date times
        pydates = this.to_py(pydates);
        return pydates;
    }

    /**
     * Take a general astropy sky coord.
     * Transform it into the Helios coordinate system and return it as a list of Helios Coordinates
     */
    _SkyCoordsToMyCoord(skycoord): Coordinate[] {
        let transformed_coord = this._get_coord(skycoord);
        let x = transformed_coord.get("y").toJs();
        let y = transformed_coord.get("z").toJs();
        let z = transformed_coord.get("x").toJs();
        let coords: Coordinate[] = [];
        for (let i = 0; i < x.length; i++) {
            const _x = x[i];
            const _y = y[i];
            const _z = z[i];
            coords.push(new Coordinate(_x, _y, _z));
        }
        return coords;
    }

    /**
     * Get an observatory's coordinates from JPL Horizons
     */
    FindObservatory(name: string, dates: Date[]): Coordinate[] {
        let position = this.get_horizons_coord(
            name,
            this._date_to_pydates(dates)
        );
        return this._SkyCoordsToMyCoord(position);
    }

    /**
     * Get the earth's position from sunpy
     */
    FindEarth(dates: [Date]): Coordinate[] {
        let position = this.get_earth(this._date_to_pydates(dates));
        return this._SkyCoordsToMyCoord(position);
    }

    async WaitForReady() {
        await this._preparation;
    }

    /**
     * Prepares the Eyes module by setting up pyodide with sunpy & astropy
     */
    async _prepare() {
        if (typeof window === "undefined") {
            this.pyodide = await loadPyodide();
        } else {
            this.pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full",
            });
        }
        await this.pyodide.loadPackage("micropip");
        let micropip = this.pyodide.pyimport("micropip");
        await micropip.install(["pyodide-http>=0.2.1"]);
        await micropip.install("sunpy", false, false);
        await micropip.install(["astropy", "astroquery"]);
        this.pyodide.runPython(`
        import pyodide_http
        pyodide_http.patch_all()  # Patch all libraries
        #from sunpy.coordinates import get_horizons_coord; get_horizons_coord
        `);
        this.get_horizons_coord = await this.pyodide.runPython(
            `from sunpy.coordinates import get_horizons_coord; get_horizons_coord`
        );

        this.to_pydate = await this.pyodide.runPython(`
        from datetime import datetime
        def _datetime_converter(value, _ignored1, _ignored2):
            if value.constructor.name == "Date":
                return datetime.fromtimestamp(value.valueOf()/1000)
            return value
        def to_datetime(value):
            return value.to_py(default_converter=_datetime_converter)
        to_datetime
        `);

        this.to_py = await this.pyodide.runPython(`
        def ___to_py___(obj):
            return obj.to_py()
        ___to_py___
        `);
        this._get_coord = await this.pyodide.runPython(`
            import sunpy.coordinates
            from sunpy.coordinates import transform_with_sun_center
            from astropy.coordinates import SkyCoord
            from sunpy.coordinates.frames import HeliographicStonyhurst
            from sunpy.coordinates import get_horizons_coord
            refpoint = sunpy.coordinates.get_earth("2018-08-11 00:00:00")
            def transform_coord(coordinate):
                with transform_with_sun_center():
                    coords = coordinate.transform_to(refpoint)
                    coords.representation_type="cartesian"
                    return {
                        "x": coords.x.to("solRad").value,
                        "y": coords.y.to("solRad").value,
                        "z": coords.z.to("solRad").value
                    }
            transform_coord
        `);

        this.get_earth = this.pyodide.runPython(`
        from sunpy.coordinates import get_earth
        get_earth
        `);
    }
}

export { Eyes };
