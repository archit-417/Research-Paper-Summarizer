document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const textTab = document.querySelector('.tab-btn:nth-child(1)');
    const pdfTab = document.querySelector('.tab-btn:nth-child(2)');
    const textInput = document.querySelector('.text-input');
    const fileInput = document.querySelector('.file-input');

    // Initialize first testimonial as active
    document.querySelector('.testimonial').classList.add('active');
    
    // Set current testimonial index
    let currentTestimonial = 0;
    const testimonials = document.querySelectorAll('.testimonial');

    textTab.addEventListener('click', function(e) {
        textTab.classList.add('active');
        pdfTab.classList.remove('active');
        textInput.style.display = 'block';
        fileInput.style.display = 'none';
        createRipple(e);
    });

    pdfTab.addEventListener('click', function(e) {
        pdfTab.classList.add('active');
        textTab.classList.remove('active');
        textInput.style.display = 'none';
        fileInput.style.display = 'flex';
        createRipple(e);
    });

    // File button functionality
    const fileBtn = document.querySelector('.file-btn');
    const fileSpan = document.querySelector('.file-input span');

    fileBtn.addEventListener('click', function(e) {
        // Simulate file selection
        fileSpan.textContent = 'research_paper_example.pdf';
        createRipple(e);
    });

    // CTA buttons
    const tryNowBtn = document.getElementById('try-now-btn');
    const goToAppBtn = document.getElementById('go-to-app-btn');

    tryNowBtn.addEventListener('click', function(e) {
        e.preventDefault();
        createRipple(e);
        setTimeout(() => {
            alert('Redirecting to Abstractify App');
            // In a real implementation, this would redirect to the actual app URL
            // window.location.href = 'https://app.abstractify.ai';
        }, 300);
    });

    goToAppBtn.addEventListener('click', function(e) {
        e.preventDefault();
        createRipple(e);
        setTimeout(() => {
            alert('Redirecting to Abstractify App');
            // In a real implementation, this would redirect to the actual app URL
            // window.location.href = 'https://app.abstractify.ai';
        }, 300);
    });

    // Testimonial carousel functionality
    const prevBtn = document.getElementById('prev-testimonial');
    const nextBtn = document.getElementById('next-testimonial');

    prevBtn.addEventListener('click', function(e) {
        createRipple(e);
        currentTestimonial = (currentTestimonial - 1 + testimonials.length) % testimonials.length;
        showTestimonial(currentTestimonial);
    });

    nextBtn.addEventListener('click', function(e) {
        createRipple(e);
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(currentTestimonial);
    });

    function showTestimonial(index) {
        // Hide all testimonials
        testimonials.forEach(testimonial => {
            testimonial.classList.remove('active');
            testimonial.style.transform = 'translateX(100%)';
        });
        
        // Show selected testimonial
        testimonials[index].classList.add('active');
        testimonials[index].style.transform = 'translateX(0)';
    }

    // Auto-rotate testimonials
    setInterval(() => {
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(currentTestimonial);
    }, 8000);

    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                createRipple(e);
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    setTimeout(() => {
                        target.scrollIntoView({
                            behavior: 'smooth'
                        });
                    }, 300);
                }
            }
        });
    });

    // Animation for feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    
    function checkScroll() {
        featureCards.forEach(card => {
            const cardPosition = card.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (cardPosition < screenPosition) {
                card.style.opacity = 1;
                card.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Initialize feature cards
    featureCards.forEach(card => {
        card.style.opacity = 0;
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease';
    });
    
    // Check on page load and scroll
    window.addEventListener('load', checkScroll);
    window.addEventListener('scroll', checkScroll);

    // Ripple effect function
    function createRipple(event) {
        const button = event.currentTarget;
        
        // Remove any existing ripples
        const ripples = button.getElementsByClassName('ripple');
        for (let i = 0; i < ripples.length; i++) {
            button.removeChild(ripples[i]);
        }
        
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        
        // Get button position
        const rect = button.getBoundingClientRect();
        
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');
        
        button.appendChild(circle);
        
        // Remove ripple after animation completes
        setTimeout(() => {
            if (circle && circle.parentNode === button) {
                button.removeChild(circle);
            }
        }, 600);
    }

    // Add ripple effect to all buttons
    const buttons = document.querySelectorAll('.cta-button, .file-btn, .tab-btn, .prev-btn, .next-btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });
});