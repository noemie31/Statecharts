import Konva from "konva";
import { createMachine, interpret } from "xstate";


const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const layer = new Konva.Layer();
stage.add(layer);

const MAX_POINTS = 10;
let polyline // La polyline en cours de construction;

const polylineMachine = createMachine(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QAcD2AbAngGQJYDswA6XCdMAYgFkB5AVQGUBRAYWwEkWBpAbQAYAuohSpYuAC65U+YSAAeiALQBGAMwAmABxFlANn0AWAOwH1uzQFYjRgDQhMSjUaIHdBgJx9d7g3z5G+dQsAX2C7NCw8QiIAEQAlAEEAdXYAOQBxanpmWgA1Jn4hJBA0MUlpWQUEFXU9Il0+TT9dNQtVdyMLOwdq5VN6g2ULPlULTR8jVSNQ8IwcAmJ45LTM2kZWDm5C2VKJKRliqpUR9SIjJvbvTQNB0e6lCwtlIievbxHXdS+ZkrmoxcSKQyWXWbE4vGURREZX2lSUaiM7hcPi8yiaeha6nu1Uez1eukRAUaamUPwi82iSyBmQAQgBDADGAGtYMhGWBtsVduUDqAjso-M8vmivAZHup3Mp3NiVFKiJKPO0PF9agZNGS-gtYoCVhQmLAGXTkBzBDtRHsKod4aM+EQ+D4nkZdKpvBpdDKDO07e5NMp1Ko+E8-ZMNZEtVTdUx8OIwAAnTnQi28+RKTQBu3qXzqPiDAUtVQy9QBeUjPpptyZyyhMIgfCoCBwM1hwhmmGWvnw4zOZQmINqTxumXOpF8PPWIxBbM90MU4ikcitpNw3qmJE9sXKTftE7u+zwpp2gMtCxmDcTkI18n-bXLDKLnnL44+Igu-wtZ2i5QygMGM6qNOmJoDSvDc1bBEAA */
        id: "polyLine",

        initial: "idle",

        states : {
            idle: {
                on: {
                    MOUSECLICK: {
                        target: "DRAWING",
                        actions: "createLine"
                    }
                }
            },

            DRAWING: {
                on: {
                    MOUSEMOVE: {
                        target: "DRAWING",
                        actions: "setLastPoint",
                        internal: true
                    },

                    MOUSECLICK: [{
                        target: "DRAWING",
                        internal: true,
                        actions: ["addPoint"],
                        cond: "pasPlein"
                    }, {
                        target: "idle",
                        actions: "saveLine"
                    }],

                    Backspace: {
                        target: "DRAWING",
                        cond: "plusDeDeuxPoints",
                        actions: "removeLastPoint",
                        internal: true
                    },

                    Escape: {
                        target: "idle",
                        actions: "abandon"
                    },

                    Enter: {
                        target: "idle",
                        actions: "saveLine",
                        cond: "plusDeDeuxPoints"
                    }
                }
            }
        }
    },
    // Quelques actions et guardes que vous pouvez utiliser dans votre machine
    {
        actions: {
            // Créer une nouvelle polyline
            createLine: (context, event) => {
                const pos = stage.getPointerPosition();
                polyline = new Konva.Line({
                    points: [pos.x, pos.y, pos.x, pos.y],
                    stroke: "red",
                    strokeWidth: 2,
                });
                layer.add(polyline);
            },
            // Mettre à jour le dernier point (provisoire) de la polyline
            setLastPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;

                const newPoints = currentPoints.slice(0, size - 2); // Remove the last point
                polyline.points(newPoints.concat([pos.x, pos.y]));
                layer.batchDraw();
            },
            // Enregistrer la polyline
            saveLine: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                // Le dernier point(provisoire) ne fait pas partie de la polyline
                const newPoints = currentPoints.slice(0, size - 2);
                polyline.points(newPoints);
                layer.batchDraw();
            },
            // Ajouter un point à la polyline
            addPoint: (context, event) => {
                const pos = stage.getPointerPosition();
                const currentPoints = polyline.points(); // Get the current points of the line
                const newPoints = [...currentPoints, pos.x, pos.y]; // Add the new point to the array
                polyline.points(newPoints); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
            },
            // Abandonner le tracé de la polyline
            abandon: (context, event) => {
                polyline.remove();
            },
            // Supprimer le dernier point de la polyline
            removeLastPoint: (context, event) => {
                const currentPoints = polyline.points(); // Get the current points of the line
                const size = currentPoints.length;
                const provisoire = currentPoints.slice(size - 2, size); // Le point provisoire
                const oldPoints = currentPoints.slice(0, size - 4); // On enlève le dernier point enregistré
                polyline.points(oldPoints.concat(provisoire)); // Set the updated points to the line
                layer.batchDraw(); // Redraw the layer to reflect the changes
            },
        },
        guards: {
            // On peut encore ajouter un point
            pasPlein: (context, event) => {
                return polyline.points().length < MAX_POINTS * 2;
            },
            // On peut enlever un point
            plusDeDeuxPoints: (context, event) => {
                // Deux coordonnées pour chaque point, plus le point provisoire
                return polyline.points().length > 6;
            },
        },
    }
);

// On démarre la machine
const polylineService = interpret(polylineMachine)
    .onTransition((state) => {
        console.log("Current state:", state.value);
    })
    .start();
// On envoie les événements à la machine
stage.on("click", () => {
    polylineService.send("MOUSECLICK");
});

stage.on("mousemove", () => {
    polylineService.send("MOUSEMOVE");
});

// Envoi des touches clavier à la machine
window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    // Enverra "a", "b", "c", "Escape", "Backspace", "Enter"... à la machine
    polylineService.send(event.key);
});
