// Convert the above to a class
import { findCorners } from "./helper";

export interface CellLike {
    row: number;
    col: number;
}

export class Point implements CellLike {
    constructor(
        public row: number,
        public col: number,
    ) {}
}

export class Rectangle {
    constructor(
        public start: Point,
        public end: Point,
    ) {}

    contains(point: Point) {
        return (
            point.row >= this.start.row &&
            point.row <= this.end.row &&
            point.col >= this.start.col &&
            point.col <= this.end.col
        );
    }
}

export class Outpost {
    public name: string;
    public start_row: number;
    public end_row: number;
    public height: number;
    public start_col: number;
    public end_col: number;
    public width: number;
    public areas: Rectangle[];
    public edge_below: boolean;

    constructor(name: string, areas: Rectangle[], edge_below: boolean) {
        this.name = name;

        const points: Point[] = [];
        areas.forEach((area) => {
            points.push(area.start);
            points.push(area.end);
        });
        const corners = findCorners(points);

        this.start_row = corners.startRow;
        this.end_row = corners.endRow;
        this.height = this.end_row - this.start_row + 1;

        this.start_col = corners.startCol;
        this.end_col = corners.endCol;
        this.width = this.end_col - this.start_col + 1;

        this.areas = areas;
        this.edge_below = edge_below;
    }
}
