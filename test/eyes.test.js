import {Eyes} from "../src/Images/eyes"
import Coordinate from "../src/common/coordinates";

let eyes = new Eyes();

test("Testing pyodide setup", async () => {
    await eyes.WaitForReady();
});

test("Test get earth position", async() => {
    let earth_position = eyes.FindEarth([new Date("2023-08-01 00:00:00Z"), new Date("2023-01-01 00:00:00Z")]);
    expect(earth_position).toStrictEqual([new Coordinate(
        -37.99271894773683,
        21.79091561121446,
        213.83549009238968
      ), new Coordinate(
        130.90833832697828,
        -10.845694659682753,
        -165.70028037020427
      )]);
})
