const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const tabs = document.querySelectorAll(".filter-tab");
const projects = document.querySelectorAll(".project-card");
const projectHeadings = document.querySelectorAll(".project-group-heading");

const updateProjectHeadings = () => {
  projectHeadings.forEach((heading) => {
    const group = heading.dataset.group;
    const hasVisibleProject = [...projects].some(
      (project) => project.dataset.group === group && !project.classList.contains("hidden")
    );
    heading.classList.toggle("hidden", !hasVisibleProject);
  });
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const filter = tab.dataset.filter;

    tabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    projects.forEach((project) => {
      const categories = project.dataset.category.split(" ");
      const shouldShow = filter === "all" || categories.includes(filter);
      project.classList.toggle("hidden", !shouldShow);
    });

    updateProjectHeadings();
  });
});

updateProjectHeadings();
