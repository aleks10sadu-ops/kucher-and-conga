export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            dishes: {
                Row: {
                    id: string | number
                    created_at?: string
                    name: string
                    description: string | null
                    price: number
                    weight: string | null
                    image_url: string | null
                    category_id: string | number | null
                    is_active: boolean
                }
                Insert: {
                    id?: string | number
                    created_at?: string
                    name: string
                    description?: string | null
                    price: number
                    weight?: string | null
                    image_url?: string | null
                    category_id?: string | number | null
                    is_active?: boolean
                }
                Update: {
                    id?: string | number
                    created_at?: string
                    name?: string
                    description?: string | null
                    price?: number
                    weight?: string | null
                    image_url?: string | null
                    category_id?: string | number | null
                    is_active?: boolean
                }
            }
            categories: {
                Row: {
                    id: string | number
                    created_at?: string
                    name: string
                    menu_type_id: string | number | null
                    sort_order: number
                    note: string | null
                }
                Insert: {
                    id?: string | number
                    created_at?: string
                    name: string
                    menu_type_id?: string | number | null
                    sort_order?: number
                    note?: string | null
                }
                Update: {
                    id?: string | number
                    created_at?: string
                    name?: string
                    menu_type_id?: string | number | null
                    sort_order?: number
                    note?: string | null
                }
            }
            menu_types: {
                Row: {
                    id: string | number // slug or id
                    created_at?: string
                    name: string
                    slug: string
                    description: string | null
                }
                Insert: {
                    id?: string | number
                    created_at?: string
                    name: string
                    slug: string
                    description?: string | null
                }
                Update: {
                    id?: string | number
                    created_at?: string
                    name?: string
                    slug?: string
                    description?: string | null
                }
            }
            dish_variants: {
                Row: {
                    id: string | number
                    dish_id: string | number
                    name: string
                    price: number
                    weight: string | null
                }
                Insert: {
                    id?: string | number
                    dish_id: string | number
                    name: string
                    price: number
                    weight?: string | null
                }
                Update: {
                    id?: string | number
                    dish_id?: string | number
                    name?: string
                    price?: number
                    weight?: string | null
                }
            }
            reservation_settings: {
                Row: {
                    id: number
                    created_at?: string
                    key: string
                    value: Json
                }
                Insert: {
                    id?: number
                    created_at?: string
                    key: string
                    value: Json
                }
                Update: {
                    id?: number
                    created_at?: string
                    key?: string
                    value?: Json
                }
            }
            staff_roles: {
                Row: {
                    id: number
                    name: string
                    department?: string
                }
                Insert: {
                    id?: number
                    name: string
                    department?: string
                }
                Update: {
                    id?: number
                    name?: string
                    department?: string
                }
            }
            staff_members: {
                Row: {
                    id: number
                    name: string
                    role_id: number
                    pin_code: string
                    is_active: boolean
                }
                Insert: {
                    id?: number
                    name: string
                    role_id: number
                    pin_code: string
                    is_active?: boolean
                }
                Update: {
                    id?: number
                    name?: string
                    role_id?: number
                    pin_code?: string
                    is_active?: boolean
                }
            }
            staff_shifts: {
                Row: {
                    id: number
                    staff_id: number
                    date: string
                    shift_type: string
                    hours: number
                }
                Insert: {
                    id?: number
                    staff_id: number
                    date: string
                    shift_type: string
                    hours: number
                }
                Update: {
                    id?: number
                    staff_id?: number
                    date?: string
                    shift_type?: string
                    hours?: number
                }
            }
        }
        Views: {
            [_: string]: {
                Row: {
                    [key: string]: Json
                }
            }
        }
        Functions: {
            get_hall_month_availability: {
                Args: {
                    p_hall_id: string
                    p_date_start: string
                    p_date_end: string
                    p_guests_count: number
                }
                Returns: {
                    date: string
                    total_capacity: number
                    reserved_count: number
                    remaining_capacity: number
                    is_full: boolean
                }[]
            }
            create_public_reservation: {
                Args: {
                    p_phone: string
                    p_first_name: string
                    p_last_name?: string
                    p_date: string
                    p_time: string
                    p_guests_count: number
                    p_hall_id?: number
                    p_comments?: string
                    p_menu_type?: string | null
                    p_status?: string
                }
                Returns: Json
            }
        }
        Enums: {
            [_: string]: string
        }
    }
}
