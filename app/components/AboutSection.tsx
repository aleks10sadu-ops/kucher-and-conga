import React from 'react';
import { Utensils, Home, Users } from 'lucide-react';

export default function AboutSection() {
    return (
        <section id="about" className="py-8 sm:py-12 lg:py-16 border-t border-white/10 pt-20 sm:pt-24 md:pt-20">
            <div className="container mx-auto px-4">
                <h2 className="text-center text-lg sm:text-xl md:text-2xl lg:text-4xl font-bold uppercase tracking-wider">ПОЧЕМУ ВЫБИРАЮТ НАС</h2>
                <div className="mt-4 sm:mt-6 lg:mt-10 grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-6">
                    <div className="rounded-lg sm:rounded-xl lg:rounded-2xl bg-white/5 p-3 sm:p-4 lg:p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
                        <Utensils className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-amber-400 mb-2 sm:mb-3 lg:mb-4 hover:scale-110 transition-transform duration-200" />
                        <h3 className="mt-2 sm:mt-3 lg:mt-4 text-sm sm:text-base lg:text-xl font-semibold">Изысканное меню</h3>
                        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-neutral-300">Наше меню сочетает в себе классические рецепты и современные гастрономические тенденции, предлагая блюда, которые восхищают своим вкусом и подачей</p>
                    </div>
                    <div className="rounded-lg sm:rounded-xl lg:rounded-2xl bg-white/5 p-3 sm:p-4 lg:p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
                        <Home className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-amber-400 mb-2 sm:mb-3 lg:mb-4 hover:scale-110 transition-transform duration-200" />
                        <h3 className="mt-2 sm:mt-3 lg:mt-4 text-sm sm:text-base lg:text-xl font-semibold">Атмосферный интерьер</h3>
                        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-neutral-300">Каждая деталь интерьера создаёт неповторимую атмосферу уюта и стиля, погружая вас в мир эстетического наслаждения и комфорта</p>
                    </div>
                    <div className="rounded-lg sm:rounded-xl lg:rounded-2xl bg-white/5 p-3 sm:p-4 lg:p-6 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-amber-400 mb-2 sm:mb-3 lg:mb-4 hover:scale-110 transition-transform duration-200" />
                        <h3 className="mt-2 sm:mt-3 lg:mt-4 text-sm sm:text-base lg:text-xl font-semibold">Безупречное обслуживание</h3>
                        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-neutral-300">Наш персонал – это команда профессионалов, которые заботятся о каждом госте, обеспечивая высокий уровень сервиса и создавая приятные впечатления от посещения</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
