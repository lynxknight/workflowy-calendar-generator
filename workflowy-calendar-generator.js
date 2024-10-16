let generatedCalendarContainer;
let calendarOptions;

window.onload = () => {
  generatedCalendarContainer = document.getElementById("generated-calendar");
  calendarOptions = document.getElementById("calendar-options");

  calendarOptions.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission
    console.log(event);
    // Get the selected radio button value
    const selectedOption = document.querySelector(
      'input[name="calendar"]:checked'
    );
    if (selectedOption) {
      const calendarValue = selectedOption.value;
      console.log("Selected calendar option:", calendarValue);

      // Here you can add logic to generate the calendar based on the selected option
    } else {
      console.log("No option selected");
    }
  });
};

//takes in date object. months are zero indexed which is super annoying and causes magic numbers in my code :/
function buildWorkflowyDateObject(date) {
  return `<time 
    startYear="${date.getFullYear()}"
    startMonth="${date.getMonth() + 1}" 
    startDay="${date.getDate()}">date
    </time>`;
}

// Function to get all dates for the year 2025
function getYearDates(year) {
  const yearDates = [];
  const startDate = new Date(year, 0, 1); // January 1 of the specified year

  // Loop through 365 days (considering 2025 is not a leap year)
  for (let i = 0; i < 365; i++) {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + i);
    yearDates.push(nextDate);
  }

  return yearDates;
}

//TODO: change this to accept a range of dates
// Example array of Date objects for the year 2025
const datesArray = getYearDates(2025); // Assume this function generates the Date objects

// Mapping month index to month names
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Function to traverse and populate jsonOpmlStructure
function populateOpml(jsonOpmlStructure, datesArray) {
  const years = new Set(); // To collect unique years

  // Collect unique years from the dates
  datesArray.forEach((date) => {
    years.add(date.getFullYear());
  });

  // Create or update the year subs
  years.forEach((year) => {
    const yearSubs = {
      level: "year",
      text: year.toString(),
      subs: [],
    };

    // Create a map to hold months and their days
    const monthMap = {};

    // Loop through the dates and group by month
    datesArray.forEach((date) => {
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth();
        const day = date.getDate();

        // Initialize month if not already done
        if (!monthMap[monthIndex]) {
          monthMap[monthIndex] = {month: monthNames[monthIndex], days: []};
        }

        // Add the day to the corresponding month
        monthMap[monthIndex].days.push(date);
      }
    });

    // Populate the year structure with months and their days
    for (const monthIndex in monthMap) {
      const monthData = monthMap[monthIndex];
      yearSubs.subs.push({
        level: "month",
        text: monthData.month,
        subs: monthData.days.map((day) => ({
          text: buildWorkflowyDateObject(day),
        })),
      });
    }

    // Add the year structure to the main OPML body
    jsonOpmlStructure.opml.body.subs.push(yearSubs);
  });
}

// Given JSON structure
const jsonOpmlStructure = {
  opml: {
    head: {},
    body: {
      subs: [], // Start with an empty array for years
    },
  },
};

function generate() {
  populateOpml(jsonOpmlStructure, datesArray);

  generatedCalendarContainer.innerText = opml.stringify(jsonOpmlStructure);
}

function copyToClipboard() {
  navigator.clipboard
    .writeText(generatedCalendarContainer.innerText)
    .then(() => {
      console.log("Text copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}
