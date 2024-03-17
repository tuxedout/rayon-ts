import {Vector2, Vector3} from "three";



export type RNVec2 = Vector2
export type RNVec3 = Vector3

function sign(x: number): number {
    return x > 0 ? 1 : (x < 0 ? -1 : 0);
}

function max(v: Vector2, threshold: number): Vector2 {
    return v.set(Math.max(v.x, threshold), Math.max(v.y, threshold));
}

export interface RNSDFMaterialInfo {
    reflecivity: number;
    refractivity: number;
    emission: RNVec3;
    absorption: RNVec3;
}

export class RNSDFMaterial implements RNSDFMaterialInfo {
    reflecivity: number = 0.0;
    refractivity: number = 0.0;
    emission: RNVec3 = new Vector3(0.0);
    absorption: RNVec3 = new Vector3(0.0);

    static reCreate(mat: RNSDFMaterial): RNSDFMaterialInfo {
        const new_mat = new RNSDFMaterial(
            new Vector3(mat.emission.x, mat.emission.y, mat.emission.z),
            new Vector3(mat.absorption.x, mat.absorption.y, mat.absorption.z),
            mat.reflecivity,
            mat.refractivity
            )

        return new_mat;
    }

    constructor(emission: Vector3, absorption: Vector3, reflectivity = 0, refractivity = 0) {
        this.emission = emission;
        this.absorption = absorption;
        this.reflecivity = reflectivity;
        this.refractivity = refractivity;
    }
}

interface RNSDFHitInfo {
    normal: {x:number, y: number};
    distance: number;
    material: RNSDFMaterialInfo;
    isHit: boolean;
}

export interface RNSDFShapeInfo {
    distance: (p: RNVec2) => number;
    isHitting: (p: RNVec2, epsilon: number) => RNSDFHitInfo;
    material: RNSDFMaterialInfo;

    readonly type: string;
}

export class RNSDFCircle implements RNSDFShapeInfo {
    center: RNVec2;
    radius: number;
    material: RNSDFMaterial;

    readonly type = 'RNSDFCircle';
    static reCreate(shape: RNSDFCircle, material: RNSDFMaterial){
        return new RNSDFCircle(
            new Vector2(shape.center.x, shape.center.y),
            shape.radius,
            material);
    }

    distance(p: RNVec2): number{
        return p.sub(this.center).length() - this.radius;
    }

    isHitting(p: RNVec2, epsilon: number): RNSDFHitInfo {
        const dist = this.distance(p);

        const res: RNSDFHitInfo = {distance: dist, material: this.material, isHit: false, normal: {x:0, y:0}};

        if (dist < epsilon) {
            res.isHit = true;
            p.multiplyScalar(this.radius);

            res.normal.x = p.x;
            res.normal.y = p.y;
        }

        return res;
    }

    constructor(center: RNVec2, radius: number, material: RNSDFMaterialInfo) {
        this.center = center;
        this.radius = radius;
        this.material = material;
    }
}

// float box(float x, float y, float cx, float cy, vec2 size) {
//     vec2 p = vec2(x-cx,y-cy);
//
//     //size -= vec2(radius);
//     vec2 d = abs(p) - size;
//     return max(-0.01, min(max(d.x, d.y), 0.0) + length(max(d, 0.0))) ;
// }

export class RNSDFBox implements RNSDFShapeInfo {
    center: RNVec2;
    size: RNVec2;
    material: RNSDFMaterial;

    readonly type = 'RNSDFBox';

    static reCreate(shape: RNSDFBox, material: RNSDFMaterial): RNSDFBox{
        return new RNSDFBox(
            new Vector2(shape.center.x, shape.center.y),
            new Vector2(shape.size.x, shape.size.y),
            material
        )
    }

    private __srv_max_vec = new Vector2(0.0,0.0);
    private __srv_d_vec = new Vector2(0.0,0.0);

    distance(p: RNVec2): number{
        p = p.sub(this.center);

        this.__srv_d_vec.set(Math.abs(p.x), Math.abs(p.y)).sub(this.size);

        this.__srv_max_vec = max(this.__srv_d_vec, 0.0);

        return Math.max(0.0, Math.min(Math.max(this.__srv_d_vec.x, this.__srv_d_vec.y), 0.0)) + this.__srv_max_vec.length();
    }
    constructor(center: RNVec2, size: RNVec2, material: RNSDFMaterial) {
        this.center = center;
        this.size = size;
        this.material = material;
    }

    private __srv_p = new Vector2(0,0);

    isHitting(p: RNVec2, epsilon: number): RNSDFHitInfo {
        this.__srv_p.set(p.x,p.y);

        const dist = this.distance(p);

        const res: RNSDFHitInfo = {distance: dist, material: this.material, isHit: false, normal: {x:0,y:0}};

        if (dist < epsilon) {
            res.isHit = true;
            this.__srv_d_vec.set(this.__srv_p.x, this.__srv_p.y).sub(this.center); // Расстояние от центра до p
            //let s = new Vector2(sign(d.x), sign(d.y)); // Направление от центра к p
            this.__srv_max_vec.set(Math.abs(this.__srv_d_vec.x), Math.abs(this.__srv_d_vec.y)).sub(this.size);

            // Выбор оси для нормали
            if (Math.abs(this.__srv_max_vec.x) > Math.abs(this.__srv_max_vec.y)) {
                res.normal.x = sign(this.__srv_d_vec.x);
            } else {
                res.normal.y = sign(this.__srv_d_vec.x);
            }
        }

        return res;
    }
}

type RNSDFShape = RNSDFCircle | RNSDFBox;

export class RNSDFScene {
    shapes: RNSDFShape[] = [];

    private __srv_hit_point = new Vector2(0.0,0.0);

    static reCreate(scene: RNSDFScene): RNSDFScene{
        const new_scene = new RNSDFScene();

        scene.shapes.forEach((shape) => {
            const mat = RNSDFMaterial.reCreate(shape.material);
            if (shape.type == 'RNSDFBox')
                new_scene.addShape(RNSDFBox.reCreate(shape, mat));
            if (shape.type == 'RNSDFCircle')
                new_scene.addShape(RNSDFCircle.reCreate(shape, mat));
        })

        return new_scene;
    }

    addShape(shape: RNSDFShape) {
        this.shapes.push(shape);
    }

    result(p: Vector2, epsilon: number): RNSDFHitInfo | null{
        let res: RNSDFHitInfo | null = null;
        let tmp_res: RNSDFHitInfo | null = null;


        this.shapes.forEach((shape) => {
            this.__srv_hit_point.set(p.x, p.y);

            tmp_res = shape.isHitting(this.__srv_hit_point, epsilon);

            if (res){
                if (tmp_res.distance < res.distance) {
                    res = tmp_res;
                }
            }else{
                res = tmp_res;
            }
        })

        return res;
    }
}

export class RNSDFTracer {
    current_point: Vector2 = new Vector2(0.0);
    direction: Vector2 = new Vector2(0.0);

    protected _max_steps: number = 10;
    max_depth: number = 10;
    protected _samples: number = 64;

    protected step_angle: number = Math.PI*2.0/this.samples;

    epsilon: number = 0.001;

    private cur_depth = 0;

    static reCreate(tracer: RNSDFTracer){
        const ntracer = new RNSDFTracer();
        ntracer.max_depth = tracer.max_depth;
        ntracer._max_steps = tracer._max_steps;
        ntracer._samples = tracer._samples;
        ntracer.epsilon = tracer.epsilon;

        return  ntracer;
    }

    set samples(val: number) {
        this._samples = val;
        this.step_angle = Math.PI*2.0/this.samples;
    }

    get samples():number {
        return this._samples;
    }

    set max_steps(val: number) {
        this._max_steps = val;
    }

    get max_steps():number {
        return this._max_steps;
    }

    constructor() {
        this.step_angle = Math.PI*2.0/this._samples;
    }

    private __srv_direction = new Vector2(0,0)

    private __blank = new Vector3(0,0,0)

    private __srv_normalizedNormal = new Vector2(0,0);
    reflectVector(v: Vector2, normal: Vector2): Vector2 {
        // Убедитесь, что нормаль нормализована
        this.__srv_normalizedNormal.set(normal.x, normal.y).normalize();

        // Вычисление отраженного вектора
        return v.sub(this.__srv_normalizedNormal.multiplyScalar(2 * v.dot(this.__srv_normalizedNormal)));
    }

    private __srv_res_normal = new Vector2(0,0);
    trace(scene: RNSDFScene, point: Vector2): void {
        //const _point = new Vector2(point.x, point.y);
        let res: RNSDFHitInfo | null = null;
        for (let i = 0; i < this.max_steps; i++){
            res = scene.result(point, this.epsilon);

            if (!res){console.log("BREAK!");break;}

            if (res.isHit){
                if (this.cur_depth < this.max_depth) {
                    this.reflectVector(this.direction, this.__srv_res_normal.set(res.normal.x, res.normal.y));
                    this.cur_depth++;
                    this.trace(scene, point.add(this.direction));
                }

                this._srv_color.add(res.material.emission);
                break;
            }

            this.__srv_direction.set(this.direction.x, this.direction.y);

            point.add(this.__srv_direction.multiplyScalar(res.distance));
        }

       // return this.__blank;
    }



    private _srv_color = new Vector3(0, 0,0)
    protected _srv_sampling_point = new Vector2(0,0)

    sample(scene: RNSDFScene, point: Vector2): RNVec3{

        let angle = 0.0;

        this._srv_color.set(0,0,0);

        let i = 0;

        this.current_point.set(point.x, point.y);

        const rand_angle = (Math.random()-0.5)*Math.PI*2.0;

        this._srv_sampling_point.set(0,0)



        for (i = 0; i < this._samples; i++) {

            this.direction.x = Math.cos(angle + rand_angle);
            this.direction.y = Math.sin(angle + rand_angle);

            this.direction.normalize();

            this._srv_sampling_point.set(this.current_point.x, this.current_point.y);

            this.trace(scene, this._srv_sampling_point);

            // if (res){
            //     this._srv_color.add(res);
            // }

            angle += this.step_angle;
        }

        //return color;
        return this._srv_color.divideScalar(this.samples);
    }
}