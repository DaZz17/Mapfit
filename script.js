'use strict';

const uuid = function () {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (
      +c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
    ).toString(16)
  );
};

class Workout {
  date = new Date();
  id = uuid();
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in KM
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  _calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this._calcSpeed();
    this._setDescription();
  }

  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// const deletebutton = document.querySelector('.delete__button');
// const editButton = document.querySelector('.edit__button');

let editButton;
let deletebutton;
let marker;

class App {
  #map;
  #mapEvent;
  #workouts = [];
  index;
  markerArr = [];

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationFeild);

    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));

    // deletebutton.removeEventListener('click', this._moveToMarker);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this)),
        function () {
          alert('Could not get your position');
        };
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const googleUrl = `https://www.google.com/maps/@${longitude},${latitude}`;

    this.coords = [latitude, longitude];

    this.#map = L.map('map').setView(this.coords, 13);

    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => {
      this._renderMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationFeild() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is correct
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be a positive number');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // check if data is correct
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be a positive number');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this.#workouts.push(workout);

    // Display Marker
    this._renderMarker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setlocalStorage();
  }

  _renderMarker(workout) {
    marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          closeButton: true,
          content: `${workout.type === 'running' ? '🏃🏻‍♂️' : '🚴🏻‍♂️'} ${
            workout.description
          }`,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .openPopup();
    marker.uuid = workout.id;
    this.markerArr.push(marker);
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃🏻‍♂️' : '🚴🏻‍♂️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === 'running') {
      html += ` 
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    <div class="workout__buttons">
      <a href="#" class="button delete__button">Delete</a>
      
    </div>
    </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevGain}</span>
      <span class="workout__unit">m</span>
    </div>
    <div class="workout__buttons">
      <a href="#" class="button delete__button">Delete</a>
    </div>
  </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);

    deletebutton = document.querySelector('.delete__button');
    deletebutton.addEventListener('click', this._deleteWorkout.bind(this));
  }

  _moveToMarker(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (workout) {
      this.#map.setView(workout.coords, 13, {
        animation: true,
        pan: {
          duration: 2,
        },
      });

      workout.click();
    }
  }

  _setlocalStorage() {
    if (!this.#workouts) return;
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem('workouts') || '');
    } catch (error) {
      return null;
    }

    data.map(work => Object.setPrototypeOf(work, new Workout()));

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _deleteWorkout(e) {
    // getting the element to be disappeared from UI
    const workoutEl = e.target.closest('.workout');
    // getting the workout object from workouts object to be deleted
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    //gettig the index of workout to be deleted from workouts array
    this.index = this.#workouts.findIndex(
      work => work.id === workoutEl.dataset.id
    );

    //Deleting Marker
    this._deleteSpecificMarker(workout);

    // Deleting workout from UI
    workoutEl.style.display = 'none';

    //Deleting workout from workouts array
    this.#workouts.splice(this.index, 1);

    // Updating the local storage array of workouts
    this._setlocalStorage();
  }

  _deleteSpecificMarker(workout) {
    const targetMarker = this.markerArr.find(
      marker => marker.uuid === workout.id
    );
    targetMarker.remove();
  }
}

const app = new App();
