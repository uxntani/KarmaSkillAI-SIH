def calculate_gap(current_level, required_level):

    gap = required_level - current_level

    if gap < 0:
        gap = 0

    if gap >= 30:
        status = "Critical"

    elif gap >= 15:
        status = "Needs Improvement"

    elif gap > 0:
        status = "Minor Gap"

    else:
        status = "Competent"

    return {
        "current_level": current_level,
        "required_level": required_level,
        "gap": round(gap, 2),
        "status": status
    }